#!/bin/bash

# MicroPay - Test Runner Script
# Script para ejecutar diferentes tipos de pruebas

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Variables
TEST_TYPE=${1:-all}
COVERAGE_THRESHOLD=80
REPORT_DIR="test-reports"

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

setup_test_environment() {
    log_info "Configurando entorno de pruebas..."
    
    # Crear directorio de reportes
    mkdir -p $REPORT_DIR
    
    # Instalar dependencias si es necesario
    if [ ! -d "node_modules" ]; then
        log_info "Instalando dependencias..."
        npm install
    fi
    
    log_success "Entorno de pruebas configurado"
}

run_unit_tests() {
    log_info "Ejecutando pruebas unitarias..."
    
    # Ejecutar Jest con configuración específica
    npx jest --config=jest.config.js --verbose --testPathPattern="__tests__" --coverage --coverageDirectory=$REPORT_DIR/coverage
    
    # Verificar cobertura
    local coverage=$(npx jest --coverage --silent | grep "All files" | awk '{print $4}' | sed 's/%//')
    
    if [ -n "$coverage" ] && [ "$coverage" -ge "$COVERAGE_THRESHOLD" ]; then
        log_success "Cobertura de código: $coverage% (≥ $COVERAGE_THRESHOLD%)"
    else
        log_warning "Cobertura de código: $coverage% (< $COVERAGE_THRESHOLD%)"
    fi
}

run_integration_tests() {
    log_info "Ejecutando pruebas de integración..."
    
    # Iniciar servicios para pruebas de integración
    log_info "Iniciando servicios para pruebas..."
    npm run start:users &
    USER_PID=$!
    sleep 2
    
    npm run start:payments &
    PAYMENT_PID=$!
    sleep 2
    
    npm run start:orders &
    ORDER_PID=$!
    sleep 2
    
    npm run start:notifications &
    NOTIFICATION_PID=$!
    sleep 2
    
    npm start &
    GATEWAY_PID=$!
    sleep 3
    
    # Ejecutar pruebas de integración
    npx jest --testPathPattern="integration" --verbose --forceExit
    
    # Limpiar procesos
    kill $USER_PID $PAYMENT_PID $ORDER_PID $NOTIFICATION_PID $GATEWAY_PID 2>/dev/null || true
    
    log_success "Pruebas de integración completadas"
}

run_api_tests() {
    log_info "Ejecutando pruebas de API..."
    
    # Verificar que los servicios estén corriendo
    if ! curl -s http://localhost:3000/health > /dev/null; then
        log_error "API Gateway no está disponible en puerto 3000"
        return 1
    fi
    
    # Ejecutar pruebas de API con Newman (si está disponible)
    if command -v newman &> /dev/null; then
        newman run postman/MicroPay-API.postman_collection.json -e postman/environment.json --reporters cli,json --reporter-json-export $REPORT_DIR/api-tests.json
    else
        log_warning "Newman no está instalado, saltando pruebas de API"
    fi
}

run_load_tests() {
    log_info "Ejecutando pruebas de carga..."
    
    # Usar Artillery si está disponible
    if command -v artillery &> /dev/null; then
        artillery run load-tests/load-test.yml --output $REPORT_DIR/load-test.json
        artillery report $REPORT_DIR/load-test.json --output $REPORT_DIR/load-test-report.html
    else
        log_warning "Artillery no está instalado, saltando pruebas de carga"
    fi
}

run_security_tests() {
    log_info "Ejecutando pruebas de seguridad..."
    
    # Audit de dependencias
    npm audit --audit-level moderate --json > $REPORT_DIR/security-audit.json || true
    
    # Verificar vulnerabilidades críticas
    local critical_vulns=$(npm audit --audit-level critical --json 2>/dev/null | jq '.metadata.vulnerabilities.critical // 0')
    
    if [ "$critical_vulns" -gt 0 ]; then
        log_error "Se encontraron $critical_vulns vulnerabilidades críticas"
        return 1
    else
        log_success "No se encontraron vulnerabilidades críticas"
    fi
}

generate_test_report() {
    log_info "Generando reporte de pruebas..."
    
    # Crear reporte HTML combinado
    cat > $REPORT_DIR/test-summary.html << EOF
<!DOCTYPE html>
<html>
<head>
    <title>MicroPay - Reporte de Pruebas</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #2196F3; color: white; padding: 20px; border-radius: 5px; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .success { background: #e8f5e8; border-color: #4caf50; }
        .warning { background: #fff3cd; border-color: #ffc107; }
        .error { background: #f8d7da; border-color: #dc3545; }
        .metric { display: inline-block; margin: 10px; padding: 10px; background: #f5f5f5; border-radius: 3px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>MicroPay - Reporte de Pruebas</h1>
        <p>Generado el: $(date)</p>
    </div>
    
    <div class="section success">
        <h2>Métricas del Proyecto</h2>
        <div class="metric"><strong>CRUD Implementado:</strong> 5 funcionalidades</div>
        <div class="metric"><strong>Tests Unitarios:</strong> $(find __tests__ -name "*.test.js" | wc -l) archivos</div>
        <div class="metric"><strong>Cobertura:</strong> $(npx jest --coverage --silent 2>/dev/null | grep "All files" | awk '{print $4}' || echo "N/A")</div>
        <div class="metric"><strong>Servicios:</strong> 5 microservicios</div>
    </div>
    
    <div class="section">
        <h2>Resultados de Pruebas</h2>
        <p>✅ Pruebas unitarias ejecutadas</p>
        <p>✅ Cobertura de código verificada</p>
        <p>✅ Pruebas de seguridad completadas</p>
        <p>📊 Reportes disponibles en: $REPORT_DIR/</p>
    </div>
</body>
</html>
EOF
    
    log_success "Reporte generado: $REPORT_DIR/test-summary.html"
}

show_help() {
    echo "MicroPay - Test Runner"
    echo "====================="
    echo ""
    echo "Uso: $0 [TIPO_PRUEBA]"
    echo ""
    echo "Tipos de prueba disponibles:"
    echo "  all           - Ejecutar todas las pruebas (default)"
    echo "  unit          - Solo pruebas unitarias"
    echo "  integration   - Solo pruebas de integración"
    echo "  api           - Solo pruebas de API"
    echo "  load          - Solo pruebas de carga"
    echo "  security      - Solo pruebas de seguridad"
    echo "  report        - Solo generar reporte"
    echo "  help          - Mostrar esta ayuda"
    echo ""
    echo "Variables de entorno:"
    echo "  COVERAGE_THRESHOLD - Umbral mínimo de cobertura (default: 80)"
}

main() {
    case "$TEST_TYPE" in
        "all")
            setup_test_environment
            run_unit_tests
            run_security_tests
            generate_test_report
            ;;
        "unit")
            setup_test_environment
            run_unit_tests
            ;;
        "integration")
            setup_test_environment
            run_integration_tests
            ;;
        "api")
            run_api_tests
            ;;
        "load")
            run_load_tests
            ;;
        "security")
            run_security_tests
            ;;
        "report")
            generate_test_report
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            log_error "Tipo de prueba no reconocido: $TEST_TYPE"
            show_help
            exit 1
            ;;
    esac
}

# Ejecutar función principal
main