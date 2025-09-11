# MicroPay - Guía de Despliegue

## 📋 Tabla de Contenidos

1. [Prerequisitos](#prerequisitos)
2. [Configuración Inicial](#configuración-inicial)
3. [Despliegue Local](#despliegue-local)
4. [Despliegue en AWS](#despliegue-en-aws)
5. [Verificación](#verificación)
6. [Troubleshooting](#troubleshooting)

## 🔧 Prerequisitos

### Software Requerido

```bash
# Node.js 18+
node --version

# Docker
docker --version

# AWS CLI v2
aws --version

# kubectl
kubectl version --client

# Terraform
terraform --version

# eksctl (opcional)
eksctl version
```

### Credenciales AWS

```bash
# Configurar credenciales AWS
aws configure

# Verificar acceso
aws sts get-caller-identity
```

## ⚙️ Configuración Inicial

### 1. Clonar y Configurar Proyecto

```bash
# Clonar repositorio
git clone <repository-url>
cd micropay-microservices

# Instalar dependencias
npm install

# Verificar configuración
node index.js help
```

### 2. Variables de Entorno

Crear archivo `.env` en la raíz del proyecto:

```bash
# AWS Configuration
AWS_REGION=us-west-2
AWS_ACCOUNT_ID=123456789012

# Cluster Configuration
CLUSTER_NAME=micropay-cluster
ENVIRONMENT=production

# JWT Configuration
JWT_SECRET=micropay-secret-key-2024

# Service Ports
API_GATEWAY_PORT=3000
USERS_PORT=3001
PAYMENTS_PORT=3002
ORDERS_PORT=3003
NOTIFICATIONS_PORT=3004
```

## 🏠 Despliegue Local

### Opción 1: Desarrollo (Node.js)

```bash
# Iniciar todos los servicios
npm run dev

# O iniciar servicios individuales
npm run start:users
npm run start:payments
npm run start:orders
npm run start:notifications
npm start  # API Gateway
```

### Opción 2: Docker Compose

```bash
# Construir imágenes
npm run docker:build

# Iniciar contenedores
npm run docker:up

# Verificar estado
docker ps

# Detener contenedores
npm run docker:down
```

### Verificación Local

```bash
# Health checks
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
curl http://localhost:3004/health

# API Documentation
curl http://localhost:3000/api/docs
```

## ☁️ Despliegue en AWS

### Opción 1: Script Automatizado

```bash
# Despliegue completo
./scripts/deploy.sh full

# Solo infraestructura
./scripts/deploy.sh infra

# Solo aplicación
./scripts/deploy.sh app
```

### Opción 2: Paso a Paso

#### 1. Infraestructura con Terraform

```bash
cd terraform

# Inicializar Terraform
terraform init

# Planificar cambios
terraform plan -var="aws_region=us-west-2" -var="cluster_name=micropay-cluster"

# Aplicar configuración
terraform apply -auto-approve
```

#### 2. Configurar kubectl

```bash
# Configurar acceso al cluster
aws eks update-kubeconfig --region us-west-2 --name micropay-cluster

# Verificar conexión
kubectl get nodes
```

#### 3. Construir y Subir Imágenes

```bash
# Obtener URL del registry ECR
ECR_REGISTRY=$(aws sts get-caller-identity --query Account --output text).dkr.ecr.us-west-2.amazonaws.com

# Login a ECR
aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin $ECR_REGISTRY

# Construir y subir imágenes
services=("api-gateway" "users" "payments" "orders" "notifications")

for service in "${services[@]}"; do
    docker build -f Dockerfile.$service -t micropay/$service:latest .
    docker tag micropay/$service:latest $ECR_REGISTRY/micropay/$service:latest
    docker push $ECR_REGISTRY/micropay/$service:latest
done
```

#### 4. Desplegar en Kubernetes

```bash
# Actualizar imágenes en deployments
sed -i "s|micropay/|$ECR_REGISTRY/micropay/|g" kubernetes/*.yaml

# Aplicar configuraciones
kubectl apply -f kubernetes/namespace.yaml
kubectl apply -f kubernetes/configmap.yaml
kubectl apply -f kubernetes/users-deployment.yaml
kubectl apply -f kubernetes/payments-deployment.yaml
kubectl apply -f kubernetes/orders-deployment.yaml
kubectl apply -f kubernetes/notifications-deployment.yaml
kubectl apply -f kubernetes/api-gateway-deployment.yaml
kubectl apply -f kubernetes/hpa.yaml
```

## ✅ Verificación

### 1. Estado del Cluster

```bash
# Verificar nodos
kubectl get nodes

# Verificar pods
kubectl get pods -n micropay

# Verificar servicios
kubectl get services -n micropay

# Verificar HPA
kubectl get hpa -n micropay
```

### 2. Logs de Aplicación

```bash
# Logs del API Gateway
kubectl logs -f deployment/api-gateway-deployment -n micropay

# Logs de un servicio específico
kubectl logs -f deployment/users-deployment -n micropay
```

### 3. Pruebas de Conectividad

```bash
# Obtener URL del Load Balancer
GATEWAY_URL=$(kubectl get service api-gateway-service -n micropay -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

# Health check
curl http://$GATEWAY_URL/health

# Documentación API
curl http://$GATEWAY_URL/api/docs
```

### 4. Pruebas Funcionales

```bash
# Registrar usuario
curl -X POST http://$GATEWAY_URL/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'

# Login
curl -X POST http://$GATEWAY_URL/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

## 🧪 Ejecutar Pruebas

### Pruebas Unitarias

```bash
# Todas las pruebas
npm test

# Con cobertura
npm run test:coverage

# Modo watch
npm run test:watch

# Script personalizado
./scripts/test-runner.sh unit
```

### Métricas de Calidad

```bash
# Verificar métricas del proyecto
echo "CRUD Implementado: 5 funcionalidades"
echo "Tests Unitarios: $(find __tests__ -name "*.test.js" | wc -l) archivos"
echo "Cobertura: $(npm run test:coverage --silent | grep "All files" | awk '{print $4}')"
echo "Servicios: 5 microservicios"
```

## 🔧 Troubleshooting

### Problemas Comunes

#### 1. Error de Credenciales AWS

```bash
# Verificar credenciales
aws sts get-caller-identity

# Reconfigurar si es necesario
aws configure
```

#### 2. Pods en Estado Pending

```bash
# Verificar recursos del cluster
kubectl describe nodes

# Verificar eventos
kubectl get events -n micropay --sort-by='.lastTimestamp'
```

#### 3. Imágenes No Encontradas

```bash
# Verificar repositorios ECR
aws ecr describe-repositories --region us-west-2

# Verificar tags de imágenes
aws ecr describe-images --repository-name micropay/api-gateway --region us-west-2
```

#### 4. Load Balancer No Disponible

```bash
# Verificar servicio
kubectl describe service api-gateway-service -n micropay

# Verificar security groups
aws ec2 describe-security-groups --filters "Name=group-name,Values=*micropay*"
```

### Comandos de Diagnóstico

```bash
# Estado general del cluster
kubectl cluster-info

# Recursos por namespace
kubectl get all -n micropay

# Logs de eventos del sistema
kubectl get events --all-namespaces --sort-by='.lastTimestamp'

# Uso de recursos
kubectl top nodes
kubectl top pods -n micropay
```

### Limpieza de Recursos

```bash
# Eliminar aplicación
kubectl delete namespace micropay

# Destruir infraestructura
cd terraform
terraform destroy -auto-approve

# Limpiar imágenes Docker locales
docker system prune -a
```

## 📊 Monitoreo y Métricas

### Dashboards Recomendados

1. **Kubernetes Dashboard**
2. **AWS CloudWatch Container Insights**
3. **Prometheus + Grafana** (opcional)

### Métricas Clave

- CPU y memoria por pod
- Latencia de requests
- Tasa de errores
- Throughput de la aplicación
- Estado del Circuit Breaker

## 🔐 Consideraciones de Seguridad

1. **Secrets Management**: Usar AWS Secrets Manager
2. **Network Policies**: Implementar políticas de red
3. **RBAC**: Configurar roles y permisos apropiados
4. **Image Scanning**: Habilitar escaneo de vulnerabilidades en ECR
5. **Encryption**: Habilitar encriptación en tránsito y en reposo

## 📚 Referencias Adicionales

- [AWS EKS Documentation](https://docs.aws.amazon.com/eks/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)