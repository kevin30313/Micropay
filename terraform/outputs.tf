# Outputs para la infraestructura de MicroPay

output "cluster_id" {
  description = "ID del cluster EKS"
  value       = aws_eks_cluster.micropay_cluster.id
}

output "cluster_arn" {
  description = "ARN del cluster EKS"
  value       = aws_eks_cluster.micropay_cluster.arn
}

output "cluster_endpoint" {
  description = "Endpoint del cluster EKS"
  value       = aws_eks_cluster.micropay_cluster.endpoint
}

output "cluster_version" {
  description = "Versión de Kubernetes del cluster"
  value       = aws_eks_cluster.micropay_cluster.version
}

output "cluster_platform_version" {
  description = "Versión de la plataforma del cluster"
  value       = aws_eks_cluster.micropay_cluster.platform_version
}

output "cluster_certificate_authority_data" {
  description = "Datos del certificado de autoridad del cluster"
  value       = aws_eks_cluster.micropay_cluster.certificate_authority[0].data
}

output "cluster_security_group_id" {
  description = "ID del security group del cluster"
  value       = aws_eks_cluster.micropay_cluster.vpc_config[0].cluster_security_group_id
}

output "node_group_arn" {
  description = "ARN del node group"
  value       = aws_eks_node_group.micropay_nodes.arn
}

output "node_group_status" {
  description = "Estado del node group"
  value       = aws_eks_node_group.micropay_nodes.status
}

output "vpc_id" {
  description = "ID de la VPC"
  value       = aws_vpc.micropay_vpc.id
}

output "vpc_arn" {
  description = "ARN de la VPC"
  value       = aws_vpc.micropay_vpc.arn
}

output "vpc_cidr_block" {
  description = "CIDR block de la VPC"
  value       = aws_vpc.micropay_vpc.cidr_block
}

output "public_subnets" {
  description = "IDs de las subredes públicas"
  value       = aws_subnet.public_subnets[*].id
}

output "private_subnets" {
  description = "IDs de las subredes privadas"
  value       = aws_subnet.private_subnets[*].id
}

output "internet_gateway_id" {
  description = "ID del Internet Gateway"
  value       = aws_internet_gateway.micropay_igw.id
}

output "nat_gateway_ids" {
  description = "IDs de los NAT Gateways"
  value       = aws_nat_gateway.nat_gateways[*].id
}

output "ecr_repository_urls" {
  description = "URLs de los repositorios ECR"
  value = {
    for repo in aws_ecr_repository.micropay_repos : repo.name => repo.repository_url
  }
}

output "ecr_repository_arns" {
  description = "ARNs de los repositorios ECR"
  value = {
    for repo in aws_ecr_repository.micropay_repos : repo.name => repo.arn
  }
}

output "sns_topic_arns" {
  description = "ARNs de los topics SNS"
  value = {
    for topic in aws_sns_topic.micropay_events : topic.name => topic.arn
  }
}

output "sqs_queue_urls" {
  description = "URLs de las colas SQS"
  value = {
    for queue in aws_sqs_queue.micropay_queues : queue.name => queue.url
  }
}

output "sqs_queue_arns" {
  description = "ARNs de las colas SQS"
  value = {
    for queue in aws_sqs_queue.micropay_queues : queue.name => queue.arn
  }
}

output "availability_zones" {
  description = "Zonas de disponibilidad utilizadas"
  value       = data.aws_availability_zones.available.names
}

output "aws_region" {
  description = "Región de AWS utilizada"
  value       = var.aws_region
}

output "environment" {
  description = "Entorno desplegado"
  value       = var.environment
}

# Outputs para configuración de kubectl
output "kubectl_config" {
  description = "Comando para configurar kubectl"
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${aws_eks_cluster.micropay_cluster.name}"
}

# Output con información de conexión
output "connection_info" {
  description = "Información de conexión al cluster"
  value = {
    cluster_name = aws_eks_cluster.micropay_cluster.name
    region       = var.aws_region
    endpoint     = aws_eks_cluster.micropay_cluster.endpoint
    kubectl_config_command = "aws eks update-kubeconfig --region ${var.aws_region} --name ${aws_eks_cluster.micropay_cluster.name}"
  }
}