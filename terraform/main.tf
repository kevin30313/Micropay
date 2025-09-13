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

# --- Variables ---
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

# Variables para las bases de datos (definir en terraform.tfvars)
variable "db_password" {
  description = "Database master password"
  type        = string
  sensitive   = true
}

# --- Data Sources ---
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# --- VPC, Subnets y Redes ---
resource "aws_vpc" "micropay_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "micropay-vpc"
    "kubernetes.io/cluster/${var.cluster_name}" = "shared"
  }
}

resource "aws_internet_gateway" "micropay_igw" {
  vpc_id = aws_vpc.micropay_vpc.id

  tags = {
    Name = "micropay-igw"
  }
}

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

resource "aws_eip" "nat_eips" {
  count = 2
  domain = "vpc"
}

resource "aws_nat_gateway" "nat_gateways" {
  count = 2

  allocation_id = aws_eip.nat_eips[count.index].id
  subnet_id     = aws_subnet.public_subnets[count.index].id
  depends_on = [aws_internet_gateway.micropay_igw]
}

resource "aws_route_table" "public_rt" {
  vpc_id = aws_vpc.micropay_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.micropay_igw.id
  }
}

resource "aws_route_table" "private_rt" {
  count = 2

  vpc_id = aws_vpc.micropay_vpc.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat_gateways[count.index].id
  }
}

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

# --- Seguridad: IAM Roles y Security Groups ---
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

# NUEVOS: Security Groups
resource "aws_security_group" "eks_sg" {
  name        = "micropay-eks-sg"
  description = "Allow all egress, allow ingress from API Gateway and self"
  vpc_id      = aws_vpc.micropay_vpc.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "rds_sg" {
  name        = "micropay-rds-sg"
  description = "Allow inbound traffic from EKS security group"
  vpc_id      = aws_vpc.micropay_vpc.id
  
  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    security_groups = [aws_security_group.eks_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# --- EKS Cluster y Node Group ---
resource "aws_eks_cluster" "micropay_cluster" {
  name     = var.cluster_name
  role_arn = aws_iam_role.eks_cluster_role.arn
  version  = "1.27"

  vpc_config {
    subnet_ids                = aws_subnet.private_subnets[*].id
    endpoint_private_access   = true
    endpoint_public_access    = true
  }

  enabled_cluster_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]
  depends_on = [ aws_iam_role_policy_attachment.eks_cluster_policy ]
}

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
}

# --- Bases de Datos ---
# NUEVO: RDS (Usuarios y Órdenes)
resource "aws_db_instance" "users_db" {
  engine             = "postgres"
  engine_version     = "14.5"
  identifier         = "users-db"
  instance_class     = "db.t3.micro"
  allocated_storage  = 20
  storage_type       = "gp2"
  db_name            = "users_db"
  username           = "admin"
  password           = var.db_password
  publicly_accessible = false
  multi_az            = true
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  subnet_group_name  = aws_db_subnet_group.micropay_db_subnet_group.name
}

resource "aws_db_instance" "orders_db" {
  engine             = "postgres"
  engine_version     = "14.5"
  identifier         = "orders-db"
  instance_class     = "db.t3.micro"
  allocated_storage  = 20
  storage_type       = "gp2"
  db_name            = "orders_db"
  username           = "admin"
  password           = var.db_password
  publicly_accessible = false
  multi_az            = true
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  subnet_group_name  = aws_db_subnet_group.micropay_db_subnet_group.name
}

resource "aws_db_subnet_group" "micropay_db_subnet_group" {
  name       = "micropay-db-subnet-group"
  subnet_ids = aws_subnet.private_subnets[*].id
}

# NUEVO: DynamoDB (Pagos)
resource "aws_dynamodb_table" "payments_db" {
  name           = "micropay-payments"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "paymentId"
  
  attribute {
    name = "paymentId"
    type = "S"
  }
}

# --- Registro de Contenedores y Mensajería ---
resource "aws_ecr_repository" "micropay_repos" {
  for_each = toset([
    "users",
    "payments",
    "orders",
    "notifications"
  ])

  name                 = each.value
  image_tag_mutability = "MUTABLE"
  image_scanning_configuration {
    scan_on_push = true
  }
}

# NUEVO: SNS y SQS para Notificaciones (revisado para coincidir con el diagrama)
resource "aws_sns_topic" "notification_events_topic" {
  name = "micropay-notification-events"
}

resource "aws_sqs_queue" "notification_events_queue" {
  name = "micropay-notification-events-queue"
}

resource "aws_sqs_queue_policy" "sqs_policy" {
  queue_url = aws_sqs_queue.notification_events_queue.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = "*"
        Action = "sqs:SendMessage"
        Resource = aws_sqs_queue.notification_events_queue.arn
        Condition = {
          ArnEquals = {
            "aws:SourceArn" = aws_sns_topic.notification_events_topic.arn
          }
        }
      }
    ]
  })
}

resource "aws_sns_topic_subscription" "notification_sqs_subscription" {
  topic_arn = aws_sns_topic.notification_events_topic.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.notification_events_queue.arn
}


# --- APIs y Autenticación ---
# NUEVO: Cognito, API Gateway y WAF
resource "aws_cognito_user_pool" "user_pool" {
  name = "micropay-user-pool"
}

resource "aws_cognito_user_pool_client" "user_pool_client" {
  name         = "micropay-user-pool-client"
  user_pool_id = aws_cognito_user_pool.user_pool.id
}

resource "aws_apigatewayv2_api" "api_gateway" {
  name          = "micropay-api-gateway"
  protocol_type = "HTTP"
}

# NUEVO: AWS Cloud Map
resource "aws_service_discovery_http_namespace" "micropay_namespace" {
  name = "micropay-namespace"
}

# --- Salidas ---
output "cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = aws_eks_cluster.micropay_cluster.endpoint
}

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.micropay_vpc.id
}

output "ecr_repository_urls" {
  description = "ECR repository URLs"
  value = {
    for repo in aws_ecr_repository.micropay_repos : repo.name => repo.repository_url
  }
}

output "rds_users_endpoint" {
  description = "Users DB endpoint"
  value       = aws_db_instance.users_db.address
}

output "rds_orders_endpoint" {
  description = "Orders DB endpoint"
  value       = aws_db_instance.orders_db.address
}

output "api_gateway_url" {
  description = "API Gateway endpoint"
  value       = aws_apigatewayv2_api.api_gateway.api_endpoint
}