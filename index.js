#!/usr/bin/env node

/**
 * MicroPay - Microservicios Orquestados
 * Script principal para gestión del proyecto
 */

const { spawn } = require('child_process');
const path = require('path');

const SERVICES = {
  'api-gateway': { port: 3000, script: 'src/api-gateway/server.js' },
  'users': { port: 3001, script: 'src/services/users/server.js' },
  'payments': { port: 3002, script: 'src/services/payments/server.js' },
  'orders': { port: 3003, script: 'src/services/orders/server.js' },
  'notifications': { port: 3004, script: 'src/services/notifications/server.js' }
};

function showHelp() {
  console.log(`
🌐 MicroPay - Microservicios Orquestados
========================================

Comandos disponibles:

  start [service]     - Iniciar servicio específico o todos
  test               - Ejecutar todas las pruebas
  test:coverage      - Ejecutar pruebas con cobertura
  test:watch         - Ejecutar pruebas en modo watch
  docker:build       - Construir imágenes Docker
  docker:up          - Levantar contenedores
  docker:down        - Detener contenedores
  k8s:deploy         - Desplegar en Kubernetes
  help               - Mostrar esta ayuda

Servicios disponibles:
${Object.keys(SERVICES).map(name => `  - ${name} (puerto ${SERVICES[name].port})`).join('\n')}

Ejemplos:
  node index.js start              # Iniciar todos los servicios
  node index.js start users        # Iniciar solo servicio de usuarios
  node index.js test              # Ejecutar pruebas
  node index.js docker:up         # Levantar con Docker
`);
}

function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });

    child.on('error', reject);
  });
}

async function startService(serviceName) {
  if (serviceName && !SERVICES[serviceName]) {
    console.error(`❌ Servicio '${serviceName}' no encontrado`);
    console.log(`Servicios disponibles: ${Object.keys(SERVICES).join(', ')}`);
    process.exit(1);
  }

  if (serviceName) {
    console.log(`🚀 Iniciando servicio: ${serviceName}`);
    await runCommand('node', [SERVICES[serviceName].script]);
  } else {
    console.log('🚀 Iniciando todos los servicios...');
    await runCommand('npm', ['run', 'dev']);
  }
}

async function runTests(type = 'default') {
  console.log('🧪 Ejecutando pruebas...');
  
  const commands = {
    'default': ['npm', ['test']],
    'coverage': ['npm', ['run', 'test:coverage']],
    'watch': ['npm', ['run', 'test:watch']]
  };

  const [cmd, args] = commands[type] || commands.default;
  await runCommand(cmd, args);
}

async function dockerCommand(action) {
  console.log(`🐳 Docker: ${action}`);
  
  const commands = {
    'build': ['npm', ['run', 'docker:build']],
    'up': ['npm', ['run', 'docker:up']],
    'down': ['npm', ['run', 'docker:down']]
  };

  const [cmd, args] = commands[action];
  if (!cmd) {
    console.error(`❌ Comando Docker '${action}' no reconocido`);
    return;
  }

  await runCommand(cmd, args);
}

async function k8sDeploy() {
  console.log('☸️  Desplegando en Kubernetes...');
  
  try {
    console.log('📦 Aplicando configuraciones de Kubernetes...');
    await runCommand('kubectl', ['apply', '-f', 'kubernetes/namespace.yaml']);
    await runCommand('kubectl', ['apply', '-f', 'kubernetes/configmap.yaml']);
    await runCommand('kubectl', ['apply', '-f', 'kubernetes/users-deployment.yaml']);
    await runCommand('kubectl', ['apply', '-f', 'kubernetes/payments-deployment.yaml']);
    await runCommand('kubectl', ['apply', '-f', 'kubernetes/orders-deployment.yaml']);
    await runCommand('kubectl', ['apply', '-f', 'kubernetes/notifications-deployment.yaml']);
    await runCommand('kubectl', ['apply', '-f', 'kubernetes/api-gateway-deployment.yaml']);
    await runCommand('kubectl', ['apply', '-f', 'kubernetes/hpa.yaml']);
    
    console.log('✅ Despliegue completado');
    console.log('🔍 Verificar estado: kubectl get pods -n micropay');
  } catch (error) {
    console.error('❌ Error en despliegue:', error.message);
  }
}

async function main() {
  const [,, command, ...args] = process.argv;

  if (!command || command === 'help') {
    showHelp();
    return;
  }

  try {
    switch (command) {
      case 'start':
        await startService(args[0]);
        break;
      case 'test':
        await runTests();
        break;
      case 'test:coverage':
        await runTests('coverage');
        break;
      case 'test:watch':
        await runTests('watch');
        break;
      case 'docker:build':
        await dockerCommand('build');
        break;
      case 'docker:up':
        await dockerCommand('up');
        break;
      case 'docker:down':
        await dockerCommand('down');
        break;
      case 'k8s:deploy':
        await k8sDeploy();
        break;
      default:
        console.error(`❌ Comando '${command}' no reconocido`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { SERVICES, runCommand, startService, runTests };