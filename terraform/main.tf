# MicroPay - Infraestructura AWS con Terraform
# Configuración para EKS, ECR, VPC y servicios asociados

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.20"
    }
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "MicroPay"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Variables
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-west-2"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "cluster_name" {
  description = "EKS cluster name"
  type        = string
  default     = "micropay-cluster"
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# VPC Configuration
resource "aws_vpc" "micropay_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "micropay-vpc"
    "kubernetes.io/cluster/${var.cluster_name}" = "shared"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "micropay_igw" {
  vpc_id = aws_vpc.micropay_vpc.id

  tags = {
    Name = "micropay-igw"
  }
}

# Public Subnets
resource "aws_subnet" "public_subnets" {
  count = 2

  vpc_id                  = aws_vpc.micropay_vpc.id
  cidr_block              = "10.0.${count.index + 1}.0/24"
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "micropay-public-subnet-${count.index + 1}"
    "kubernetes.io/cluster/${var.cluster_name}" = "shared"
    "kubernetes.io/role/elb" = "1"
  }
}

# Private Subnets
resource "aws_subnet" "private_subnets" {
  count = 2

  vpc_id            = aws_vpc.micropay_vpc.id
  cidr_block        = "10.0.${count.index + 10}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "micropay-private-subnet-${count.index + 1}"
    "kubernetes.io/cluster/${var.cluster_name}" = "shared"
    "kubernetes.io/role/internal-elb" = "1"
  }
}

# NAT Gateways
resource "aws_eip" "nat_eips" {
  count = 2
  domain = "vpc"

  tags = {
    Name = "micropay-nat-eip-${count.index + 1}"
  }
}

resource "aws_nat_gateway" "nat_gateways" {
  count = 2

  allocation_id = aws_eip.nat_eips[count.index].id
  subnet_id     = aws_subnet.public_subnets[count.index].id

  tags = {
    Name = "micropay-nat-gateway-${count.index + 1}"
  }

  depends_on = [aws_internet_gateway.micropay_igw]
}

# Route Tables
resource "aws_route_table" "public_rt" {
  vpc_id = aws_vpc.micropay_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.micropay_igw.id
  }

  tags = {
    Name = "micropay-public-rt"
  }
}

resource "aws_route_table" "private_rt" {
  count = 2

  vpc_id = aws_vpc.micropay_vpc.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateways[count.index].id
  }

  tags = {
    Name = "micropay-private-rt-${count.index + 1}"
  }
}

# Route Table Associations
resource "aws_route_table_association" "public_rta" {
  count = 2

  subnet_id      = aws_subnet.public_subnets[count.index].id
  route_table_id = aws_route_table.public_rt.id
}

resource "aws_route_table_association" "private_rta" {
  count = 2

  subnet_id      = aws_subnet.private_subnets[count.index].id
  route_table_id = aws_route_table.private_rt[count.index].id
}

# ECR Repositories
resource "aws_ecr_repository" "micropay_repos" {
  for_each = toset([
    "micropay/api-gateway",
    "micropay/users",
    "micropay/payments", 
    "micropay/orders",
    "micropay/notifications"
  ])

  name                 = each.value
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name = each.value
  }
}

# EKS Cluster IAM Role
resource "aws_iam_role" "eks_cluster_role" {
  name = "micropay-eks-cluster-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "eks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.eks_cluster_role.name
}

# EKS Node Group IAM Role
resource "aws_iam_role" "eks_node_role" {
  name = "micropay-eks-node-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "eks_worker_node_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = aws_iam_role.eks_node_role.name
}

resource "aws_iam_role_policy_attachment" "eks_cni_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.eks_node_role.name
}

resource "aws_iam_role_policy_attachment" "eks_container_registry_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = aws_iam_role.eks_node_role.name
}

# EKS Cluster
resource "aws_eks_cluster" "micropay_cluster" {
  name     = var.cluster_name
  role_arn = aws_iam_role.eks_cluster_role.arn
  version  = "1.27"

  vpc_config {
    subnet_ids              = concat(aws_subnet.public_subnets[*].id, aws_subnet.private_subnets[*].id)
    endpoint_private_access = true
    endpoint_public_access  = true
    public_access_cidrs     = ["0.0.0.0/0"]
  }

  enabled_cluster_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]

  depends_on = [
    aws_iam_role_policy_attachment.eks_cluster_policy
  ]

  tags = {
    Name = var.cluster_name
  }
}

# EKS Node Group
resource "aws_eks_node_group" "micropay_nodes" {
  cluster_name    = aws_eks_cluster.micropay_cluster.name
  node_group_name = "micropay-nodes"
  node_role_arn   = aws_iam_role.eks_node_role.arn
  subnet_ids      = aws_subnet.private_subnets[*].id

  capacity_type  = "ON_DEMAND"
  instance_types = ["t3.medium"]

  scaling_config {
    desired_size = 3
    max_size     = 10
    min_size     = 2
  }

  update_config {
    max_unavailable = 1
  }

  depends_on = [
    aws_iam_role_policy_attachment.eks_worker_node_policy,
    aws_iam_role_policy_attachment.eks_cni_policy,
    aws_iam_role_policy_attachment.eks_container_registry_policy,
  ]

  tags = {
    Name = "micropay-nodes"
  }
}

# SNS Topics
resource "aws_sns_topic" "micropay_events" {
  for_each = toset([
    "user-events",
    "payment-events",
    "order-events",
    "notification-events"
  ])

  name = "micropay-${each.value}"

  tags = {
    Name = "micropay-${each.value}"
  }
}

# SQS Queues
resource "aws_sqs_queue" "micropay_queues" {
  for_each = toset([
    "user-events",
    "payment-events", 
    "order-events",
    "notification-events"
  ])

  name                      = "micropay-${each.value}"
  delay_seconds             = 0
  max_message_size          = 262144
  message_retention_seconds = 1209600
  receive_wait_time_seconds = 10

  tags = {
    Name = "micropay-${each.value}"
  }
}

# SNS to SQS Subscriptions
resource "aws_sns_topic_subscription" "micropay_subscriptions" {
  for_each = toset([
    "user-events",
    "payment-events",
    "order-events", 
    "notification-events"
  ])

  topic_arn = aws_sns_topic.micropay_events[each.value].arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.micropay_queues[each.value].arn
}

# Outputs
output "cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = aws_eks_cluster.micropay_cluster.endpoint
}

output "cluster_name" {
  description = "EKS cluster name"
  value       = aws_eks_cluster.micropay_cluster.name
}

output "ecr_repositories" {
  description = "ECR repository URLs"
  value = {
    for repo in aws_ecr_repository.micropay_repos : repo.name => repo.repository_url
  }
}

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.micropay_vpc.id
}

output "sns_topics" {
  description = "SNS topic ARNs"
  value = {
    for topic in aws_sns_topic.micropay_events : topic.name => topic.arn
  }
}

output "sqs_queues" {
  description = "SQS queue URLs"
  value = {
    for queue in aws_sqs_queue.micropay_queues : queue.name => queue.url
  }
}