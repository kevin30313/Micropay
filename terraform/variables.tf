# Variables para la infraestructura de MicroPay

variable "aws_region" {
  description = "Región de AWS donde desplegar la infraestructura"
  type        = string
  default     = "us-west-2"
  
  validation {
    condition = can(regex("^[a-z]{2}-[a-z]+-[0-9]$", var.aws_region))
    error_message = "La región debe tener el formato correcto (ej: us-west-2)."
  }
}

variable "environment" {
  description = "Nombre del entorno (dev, staging, production)"
  type        = string
  default     = "production"
  
  validation {
    condition = contains(["dev", "staging", "production"], var.environment)
    error_message = "El entorno debe ser dev, staging o production."
  }
}

variable "cluster_name" {
  description = "Nombre del cluster EKS"
  type        = string
  default     = "micropay-cluster"
  
  validation {
    condition = can(regex("^[a-zA-Z][a-zA-Z0-9-]*$", var.cluster_name))
    error_message = "El nombre del cluster debe comenzar con una letra y contener solo letras, números y guiones."
  }
}

variable "node_instance_type" {
  description = "Tipo de instancia para los nodos del cluster"
  type        = string
  default     = "t3.medium"
}

variable "node_desired_size" {
  description = "Número deseado de nodos en el cluster"
  type        = number
  default     = 3
  
  validation {
    condition = var.node_desired_size >= 2 && var.node_desired_size <= 20
    error_message = "El número de nodos debe estar entre 2 y 20."
  }
}

variable "node_max_size" {
  description = "Número máximo de nodos en el cluster"
  type        = number
  default     = 10
}

variable "node_min_size" {
  description = "Número mínimo de nodos en el cluster"
  type        = number
  default     = 2
}

variable "vpc_cidr" {
  description = "CIDR block para la VPC"
  type        = string
  default     = "10.0.0.0/16"
  
  validation {
    condition = can(cidrhost(var.vpc_cidr, 0))
    error_message = "El CIDR de la VPC debe ser válido."
  }
}

variable "enable_nat_gateway" {
  description = "Habilitar NAT Gateway para subredes privadas"
  type        = bool
  default     = true
}

variable "enable_vpn_gateway" {
  description = "Habilitar VPN Gateway"
  type        = bool
  default     = false
}

variable "enable_dns_hostnames" {
  description = "Habilitar DNS hostnames en la VPC"
  type        = bool
  default     = true
}

variable "enable_dns_support" {
  description = "Habilitar DNS support en la VPC"
  type        = bool
  default     = true
}

variable "map_public_ip_on_launch" {
  description = "Asignar IP pública automáticamente en subredes públicas"
  type        = bool
  default     = true
}

variable "cluster_version" {
  description = "Versión de Kubernetes para el cluster EKS"
  type        = string
  default     = "1.27"
}

variable "cluster_endpoint_private_access" {
  description = "Habilitar acceso privado al endpoint del cluster"
  type        = bool
  default     = true
}

variable "cluster_endpoint_public_access" {
  description = "Habilitar acceso público al endpoint del cluster"
  type        = bool
  default     = true
}

variable "cluster_endpoint_public_access_cidrs" {
  description = "Lista de CIDRs que pueden acceder al endpoint público"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "enable_irsa" {
  description = "Habilitar IAM Roles for Service Accounts"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Tags adicionales para aplicar a todos los recursos"
  type        = map(string)
  default = {
    Project     = "MicroPay"
    Owner       = "DevOps Team"
    CostCenter  = "Engineering"
  }
}