#!/bin/bash

# MicroPay - Script de despliegue automatizado
# Este script automatiza el proceso completo de despliegue

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables
AWS_REGION=${AWS_REGION:-us-west-2}
CLUSTER_NAME=${CLUSTER_NAME:-micropay-cluster}
ECR_REGISTRY=""
ENVIRONMENT=${ENVIRONMENT:-production}

# Funciones de utilidad
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Verificando prerequisitos..."
    
    # Verificar AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI no está instalado"
        exit 1
    fi
    
    # Verificar kubectl
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl no está instalado"
        exit 1
    fi
    
    # Verificar Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker no está instalado"
        exit 1
    fi
    
    # Verificar Terraform
    if ! command -v terraform &> /dev/null; then
        log_error "Terraform no está instalado"
        exit 1
    fi
    
    # Verificar credenciales AWS
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "Credenciales AWS no configuradas"
        exit 1
    fi
    
    log_success "Todos los prerequisitos están instalados"
}

setup_infrastructure() {
    log_info "Configurando infraestructura con Terraform..."
    
    cd terraform
    
    # Inicializar Terraform
    terraform init
    
    # Planificar cambios
    terraform plan -var="aws_region=$AWS_REGION" -var="cluster_name=$CLUSTER_NAME" -var="environment=$ENVIRONMENT"
    
    # Aplicar cambios
    log_info "Aplicando configuración de infraestructura..."
    terraform apply -auto-approve -var="aws_region=$AWS_REGION" -var="cluster_name=$CLUSTER_NAME" -var="environment=$ENVIRONMENT"
    
    # Obtener outputs
    ECR_REGISTRY=$(terraform output -raw ecr_repositories | jq -r '.["micropay/api-gateway"]' | cut -d'/' -f1)
    
    cd ..
    
    log_success "Infraestructura configurada correctamente"
}

configure_kubectl() {
    log_info "Configurando kubectl para el cluster EKS..."
    
    aws eks update-kubeconfig --region $AWS_REGION --name $CLUSTER_NAME
    
    # Verificar conexión
    kubectl get nodes
    
    log_success "kubectl configurado correctamente"
}

build_and_push_images() {
    log_info "Construyendo y subiendo imágenes Docker..."
    
    # Login a ECR
    aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY
    
    # Servicios a construir
    services=("api-gateway" "users" "payments" "orders" "notifications")
    
    for service in "${services[@]}"; do
        log_info "Construyendo imagen para $service..."
        
        # Construir imagen
        docker build -f Dockerfile.$service -t micropay/$service:latest .
        
        # Tagear para ECR
        docker tag micropay/$service:latest $ECR_REGISTRY/micropay/$service:latest
        
        # Subir a ECR
        docker push $ECR_REGISTRY/micropay/$service:latest
        
        log_success "Imagen $service subida correctamente"
    done
}

deploy_to_kubernetes() {
    log_info "Desplegando aplicación en Kubernetes..."
    
    # Actualizar imágenes en los deployments
    sed -i.bak "s|micropay/|$ECR_REGISTRY/micropay/|g" kubernetes/*.yaml
    
    # Aplicar configuraciones
    kubectl apply -f kubernetes/namespace.yaml
    kubectl apply -f kubernetes/configmap.yaml
    
    # Desplegar servicios
    kubectl apply -f kubernetes/users-deployment.yaml
    kubectl apply -f kubernetes/payments-deployment.yaml
    kubectl apply -f kubernetes/orders-deployment.yaml
    kubectl apply -f kubernetes/notifications-deployment.yaml
    kubectl apply -f kubernetes/api-gateway-deployment.yaml
    
    # Configurar auto-escalado
    kubectl apply -f kubernetes/hpa.yaml
    
    # Esperar a que los pods estén listos
    log_info "Esperando a que los pods estén listos..."
    kubectl wait --for=condition=ready pod -l app=users-service -n micropay --timeout=300s
    kubectl wait --for=condition=ready pod -l app=payments-service -n micropay --timeout=300s
    kubectl wait --for=condition=ready pod -l app=orders-service -n micropay --timeout=300s
    kubectl wait --for=condition=ready pod -l app=notifications-service -n micropay --timeout=300s
    kubectl wait --for=condition=ready pod -l app=api-gateway -n micropay --timeout=300s
    
    log_success "Aplicación desplegada correctamente"
}

verify_deployment() {
    log_info "Verificando despliegue..."
    
    # Mostrar estado de pods
    kubectl get pods -n micropay
    
    # Mostrar servicios
    kubectl get services -n micropay
    
    # Mostrar HPA
    kubectl get hpa -n micropay
    
    # Obtener URL del Load Balancer
    log_info "Obteniendo URL del API Gateway..."
    kubectl get service api-gateway-service -n micropay -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
    
    log_success "Despliegue verificado correctamente"
}

run_tests() {
    log_info "Ejecutando pruebas..."
    
    # Ejecutar pruebas unitarias
    npm test
    
    # Ejecutar pruebas de cobertura
    npm run test:coverage
    
    log_success "Todas las pruebas pasaron correctamente"
}

cleanup() {
    log_info "Limpiando recursos temporales..."
    
    # Restaurar archivos de Kubernetes
    if [ -f kubernetes/users-deployment.yaml.bak ]; then
        mv kubernetes/users-deployment.yaml.bak kubernetes/users-deployment.yaml
    fi
    
    # Limpiar imágenes Docker locales
    docker system prune -f
    
    log_success "Limpieza completada"
}

show_help() {
    echo "MicroPay - Script de Despliegue"
    echo "================================"
    echo ""
    echo "Uso: $0 [COMANDO]"
    echo ""
    echo "Comandos disponibles:"
    echo "  full          - Despliegue completo (infraestructura + aplicación)"
    echo "  infra         - Solo infraestructura"
    echo "  app           - Solo aplicación"
    echo "  test          - Ejecutar pruebas"
    echo "  cleanup       - Limpiar recursos"
    echo "  destroy       - Destruir infraestructura"
    echo "  help          - Mostrar esta ayuda"
    echo ""
    echo "Variables de entorno:"
    echo "  AWS_REGION    - Región AWS (default: us-west-2)"
    echo "  CLUSTER_NAME  - Nombre del cluster (default: micropay-cluster)"
    echo "  ENVIRONMENT   - Entorno (default: production)"
}

destroy_infrastructure() {
    log_warning "¿Estás seguro de que quieres destruir la infraestructura? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        log_info "Destruyendo infraestructura..."
        cd terraform
        terraform destroy -auto-approve -var="aws_region=$AWS_REGION" -var="cluster_name=$CLUSTER_NAME" -var="environment=$ENVIRONMENT"
        cd ..
        log_success "Infraestructura destruida"
    else
        log_info "Operación cancelada"
    fi
}

# Función principal
main() {
    case "${1:-full}" in
        "full")
            check_prerequisites
            setup_infrastructure
            configure_kubectl
            build_and_push_images
            deploy_to_kubernetes
            verify_deployment
            run_tests
            cleanup
            ;;
        "infra")
            check_prerequisites
            setup_infrastructure
            configure_kubectl
            ;;
        "app")
            check_prerequisites
            build_and_push_images
            deploy_to_kubernetes
            verify_deployment
            cleanup
            ;;
        "test")
            run_tests
            ;;
        "cleanup")
            cleanup
            ;;
        "destroy")
            destroy_infrastructure
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            log_error "Comando no reconocido: $1"
            show_help
            exit 1
            ;;
    esac
}

# Trap para cleanup en caso de error
trap cleanup EXIT

# Ejecutar función principal
main "$@"