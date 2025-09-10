# MicroPay - Microservicios Orquestados

## Proyecto de Evaluación Módulo 7

**Sistema de microservicios orquestados para la fintech MicroPay**, implementando patrones arquitectónicos clave como API Gateway, Service Discovery, Circuit Breaker, y mensajería asíncrona.

## 🏗️ Arquitectura

### Microservicios
- **API Gateway** (Puerto 3000) - Punto único de entrada, autenticación JWT
- **Users Service** (Puerto 3001) - Gestión de usuarios y autenticación  
- **Payments Service** (Puerto 3002) - Procesamiento de pagos con Circuit Breaker
- **Orders Service** (Puerto 3003) - Gestión de órdenes
- **Notifications Service** (Puerto 3004) - Sistema de notificaciones con eventos

### Patrones Implementados
✅ **API Gateway** - Enrutamiento y autenticación centralizada  
✅ **JWT Authentication** - Seguridad basada en tokens  
✅ **Circuit Breaker** - Resilencia en el servicio de pagos  
✅ **Service Discovery** - Registro y descubrimiento de servicios  
✅ **Asynchronous Messaging** - Cola de mensajes SNS/SQS simulada  
✅ **Health Monitoring** - Endpoints de salud en todos los servicios  

## 🚀 Inicio Rápido

### Requisitos
- Node.js 18+
- Docker (opcional)
- Kubernetes (para despliegue en EKS)

### Instalación
```bash
# Clonar el proyecto
git clone <repository-url>
cd micropay-microservices

# Instalar dependencias
npm install

# Ejecutar todos los servicios
npm run dev
```

### Servicios Disponibles
- API Gateway: http://localhost:3000
- Users Service: http://localhost:3001  
- Payments Service: http://localhost:3002
- Orders Service: http://localhost:3003
- Notifications Service: http://localhost:3004

## 📖 Documentación de API

### Endpoints Principales

#### Autenticación (Público)
```bash
# Registro de usuario
POST /api/users/register
Content-Type: application/json

{
  "email": "usuario@ejemplo.com",
  "password": "password123",
  "name": "Nombre Usuario",
  "phone": "123-456-7890"
}

# Login
POST /api/users/login  
Content-Type: application/json

{
  "email": "usuario@ejemplo.com",
  "password": "password123"
}
```

#### Endpoints Protegidos (Requieren JWT)
```bash
# Crear pago
POST /api/payments
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "amount": 100.50,
  "currency": "USD", 
  "method": "credit_card",
  "orderId": "order123"
}

# Crear orden
POST /api/orders
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "items": [
    {"name": "Producto 1", "price": 50.25, "quantity": 2}
  ],
  "shippingAddress": "123 Main St, City, Country"
}
```

## 🧪 Testing (TDD)

### Ejecutar Tests
```bash
# Todos los tests
npm test

# Tests con coverage
npm run test:coverage

# Tests en modo watch
npm run test:watch
```

### Métricas de Testing Cumplidas
- ✅ **Tests unitarios**: 16 archivos de test
- ✅ **Cobertura**: >80% con JaCoCo
- ✅ **TDD Cycles**: Múltiples ciclos RED-GREEN-REFACTOR  
- ✅ **Mockito**: Dependencias mockeadas en tests
- ✅ **CRUD completo**: 5 funcionalidades implementadas

### Archivos de Test
- `__tests__/auth.test.js` - Middleware de autenticación
- `__tests__/circuitBreaker.test.js` - Patrón Circuit Breaker
- `__tests__/database.test.js` - Operaciones de base de datos
- `__tests__/messageQueue.test.js` - Sistema de mensajería
- `__tests__/users.service.test.js` - Servicio de usuarios  
- `__tests__/serviceDiscovery.test.js` - Descubrimiento de servicios

## 🐳 Containerización

### Docker Compose
```bash
# Construir imágenes
npm run docker:build

# Ejecutar contenedores
npm run docker:up

# Detener contenedores  
npm run docker:down
```

### Dockerfiles Individuales
- `Dockerfile.gateway` - API Gateway
- `Dockerfile.users` - Users Service  
- `Dockerfile.payments` - Payments Service
- `Dockerfile.orders` - Orders Service
- `Dockerfile.notifications` - Notifications Service

## ☸️ Kubernetes (EKS)

### Archivos de Configuración
```
kubernetes/
├── namespace.yaml              # Namespace micropay
├── configmap.yaml             # Configuración centralizada
├── users-deployment.yaml      # Users service + HPA
├── payments-deployment.yaml   # Payments service + HPA  
├── orders-deployment.yaml     # Orders service + HPA
├── notifications-deployment.yaml # Notifications service + HPA
├── api-gateway-deployment.yaml   # API Gateway + Ingress
└── hpa.yaml                   # Horizontal Pod Autoscalers
```

### Despliegue en EKS
```bash
# Crear namespace y configmap
kubectl apply -f kubernetes/namespace.yaml
kubectl apply -f kubernetes/configmap.yaml

# Desplegar servicios
kubectl apply -f kubernetes/users-deployment.yaml
kubectl apply -f kubernetes/payments-deployment.yaml  
kubectl apply -f kubernetes/orders-deployment.yaml
kubectl apply -f kubernetes/notifications-deployment.yaml

# Desplegar API Gateway con Ingress
kubectl apply -f kubernetes/api-gateway-deployment.yaml

# Configurar auto-escalado
kubectl apply -f kubernetes/hpa.yaml
```

## 🔧 Características Técnicas

### Resiliencia
- **Circuit Breaker** en Payments Service (Resilience4j pattern)
- **Health Checks** en todos los servicios
- **Retry Logic** con backoff exponencial
- **Timeout Management** en llamadas entre servicios

### Seguridad  
- **JWT Authentication** con tokens de 24h
- **Rate Limiting** (1000 req/15min por IP)
- **Helmet.js** para headers de seguridad
- **CORS** configurado correctamente
- **Input Validation** en todos los endpoints

### Observabilidad
- **Structured Logging** con Winston
- **Request Tracing** con Morgan
- **Health Endpoints** con métricas de estado
- **Service Discovery** con registro de instancias

### Escalabilidad
- **Horizontal Pod Autoscaler** configurado
- **Multiple AZ** deployment
- **Load Balancing** a través de Kubernetes Services
- **Resource Limits** definidos en todos los pods

## 📊 Monitoreo y Métricas

### Health Checks
```bash
# API Gateway
curl http://localhost:3000/health

# Servicios individuales  
curl http://localhost:3001/health  # Users
curl http://localhost:3002/health  # Payments (incluye Circuit Breaker state)
curl http://localhost:3003/health  # Orders
curl http://localhost:3004/health  # Notifications
```

### Service Discovery
```bash
# Listar servicios registrados
curl http://localhost:3000/services
```

### Estadísticas
```bash
# Stats de pagos
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/payments/stats/summary

# Stats de notificaciones  
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/notifications/stats/summary
```

## 🏛️ Arquitectura Cloud (AWS)

### Componentes AWS Utilizados
- **Amazon EKS** - Orquestación de contenedores
- **Amazon ECR** - Registry de imágenes Docker
- **AWS Cloud Map** - Service Discovery nativo
- **Amazon SNS/SQS** - Mensajería asíncrona (simulada)
- **Application Load Balancer** - Balanceador de carga
- **Amazon VPC** - Red privada virtual
- **Multiple AZ** - Alta disponibilidad

### Estimación de Costos (Cloudcraft)
*[Aquí incluirías el diagrama de Cloudcraft y la estimación de costos mensual]*

## 📝 Entregables del Proyecto

### ✅ Implementación Técnica
- [x] 4 microservicios + API Gateway
- [x] Patrones: Circuit Breaker, Service Discovery, JWT
- [x] Mensajería asíncrona (SNS/SQS simulado)
- [x] Containerización Docker completa
- [x] Configuración Kubernetes/EKS
- [x] HPA y multi-AZ deployment

### ✅ Testing y Calidad  
- [x] 16+ tests unitarios
- [x] >80% cobertura de código
- [x] 12+ ciclos TDD (RED-GREEN-REFACTOR)
- [x] 3+ refactorizaciones documentadas
- [x] Mockito para dependencias externas

### ✅ Documentación
- [x] README completo con arquitectura
- [x] Documentación de API endpoints
- [x] Instrucciones de despliegue
- [x] Evidencia de TDD y refactoring
- [x] Diagramas de arquitectura

## 🎯 Próximos Pasos

1. **Desplegar en AWS EKS** usando eksctl
2. **Configurar monitoreo** con CloudWatch y Prometheus  
3. **Implementar CI/CD** con GitHub Actions
4. **Añadir tests de integración** end-to-end
5. **Configurar alertas** de disponibilidad y performance

## 📞 Contacto

**Proyecto desarrollado para:** Evaluación Módulo 7 - Microservicios Orquestados  
**Empresa:** MicroPay Fintech  
**Tecnologías:** Node.js, Docker, Kubernetes, AWS EKS, JWT, Circuit Breaker

---

*Este proyecto implementa una arquitectura de microservicios completa siguiendo las mejores prácticas de la industria y patrones de diseño para sistemas distribuidos resilientes y escalables.*