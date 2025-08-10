# Rustler Helm Chart

A Helm chart for deploying the Rustler personal finance backend to Kubernetes.

## Prerequisites
- Kubernetes >= 1.22
- A container image for Rustler accessible to your cluster. Default: `ghcr.io/yourusername/rustler:latest`
- A Kubernetes Secret containing `DATABASE_URL` or allow the chart to create one from a provided value.

## Installing the Chart

```bash
helm repo add rustler https://yourusername.github.io/rustler
helm repo update
helm install rustler rustler/rustler \
  --set image.repository=ghcr.io/yourusername/rustler \
  --set image.tag=latest \
  --set database.existingSecret=my-db-secret
```

Alternatively, create the secret with the chart:

```bash
helm install rustler rustler/rustler \
  --set database.createSecret=true \
  --set database.secretName=rustler-db \
  --set database.url=postgres://username:password@host:5432/rustler
```

## Values

- replicaCount: number of replicas (default 1)
- image.repository: container image repository
- image.tag: image tag
- service.port: app port inside container (default 3000)
- env.HOST: default 0.0.0.0
- env.PORT: default 3000
- env.RUST_LOG: default info
- database.createSecret: whether to create a secret from `database.url`
- database.existingSecret: use existing secret name if available
- ingress.enabled: enable/disable ingress

See `values.yaml` for the full list of configurable parameters.
