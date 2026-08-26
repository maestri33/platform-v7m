---
name: django-ninja
description: |
  Especialista em desenvolvimento, refatoração, otimização, testes e arquitetura de APIs RESTful usando Django Ninja, Django ORM e Pydantic v2.
  Ativar quando:
  - Criar, modificar ou revisar endpoints, rotas, operações ou routers no Django Ninja.
  - Modelar schemas Pydantic de entrada, atualização parcial (PATCH), saída (Response) e filtros (FilterSchema).
  - Configurar autenticação e autorização (JWT, Bearer, APIKey, RBAC/Roles).
  - Otimizar consultas do Django ORM para APIs (select_related, prefetch_related, prevenção de N+1 queries).
  - Padronizar tratamento global de exceções, status codes e contratos OpenAPI/Swagger.
  - Escrever testes automatizados de integração utilizando ninja.testing.TestClient.
  - Implementar endpoints assíncronos (async def) com sync_to_async ou ORM assíncrono.
metadata:
  version: "1.0.0"
  publisher: "maestri33"
---

# 🥷 Django Ninja Expert Skill

Guia completo e padronizado para desenvolvimento de APIs de alta performance com **Django Ninja**, **Django ORM** e **Pydantic v2**.

---

## 🎯 1. Princípios Arquiteturais & Boas Práticas

1. **Type-Safety & Validação Estrita**: Utilizar sempre type hints nativos (Python 3.10+ `str | None`, `Annotated`, etc.) e Schemas Pydantic.
2. **Separação de Camadas (Clean Architecture)**:
   - **Router / Controller (`api.py`)**: Valida payload, gerencia autenticação/permissões, delega lógica e retorna respostas com status HTTP explícitos.
   - **Service / Domain Layer (`services.py`)**: Centraliza regras de negócio puras, transações atômicas e integrações com serviços externos.
   - **ORM / Data Layer (`models.py`)**: Modelos de banco de dados com consultas otimizadas (`select_related`, `prefetch_related`).
3. **OpenAPI / Swagger First**: Todo endpoint deve conter `summary`, `description`, tags organizadas e códigos de status HTTP explícitos.
4. **Isolamento de Schemas**: NUNCA reutilize o mesmo schema para criação (`In`), atualização parcial (`PatchIn`) e serialização de resposta (`Out`).
5. **Async com Cuidado**: Utilize `async def` para operações intensivas de I/O de rede / chamadas de APIs externas (`httpx.AsyncClient`). Para ORM síncrono, utilize `sync_to_async` ou métodos assíncronos nativos (`Model.objects.aget(...)`).

---

## 🏗️ 2. Estrutura Recomendada de Projeto

```text
backend/
├── config/
│   ├── api.py               # Instância central do NinjaAPI e agregação de routers
│   ├── settings.py          # Configurações do Django
│   └── urls.py              # api.urls montado nas rotas principais (path("api/v1/", api.urls))
└── apps/
    ├── core/
    │   ├── auth.py          # Autenticadores personalizados (JWTAuthBearer, APIKey)
    │   ├── exceptions.py    # Handlers globais de exceção
    │   ├── pagination.py    # Configurações/classes de paginação customizadas
    │   ├── renderers.py     # Renderers (ex: ORJSONRenderer)
    │   └── schemas.py       # Schemas genéricos (ErrorOut, MessageOut, PagedOut)
    └── [modulo_dominio]/
        ├── api.py           # Routers do módulo (ex: router = Router(tags=["..."]))
        ├── models.py        # Django ORM Models
        ├── schemas.py       # Schemas Pydantic (In, UpdateIn, Out, FilterSchema)
        ├── services.py      # Lógica de negócio e orquestração
        └── tests/
            ├── test_api.py  # Testes de integração com TestClient
            └── test_services.py
```

---

## 🛠️ 3. Padrões de Código & Implementação

### 3.1. Instanciação Central do `NinjaAPI`

```python
# config/api.py
from ninja import NinjaAPI
from apps.core.exceptions import setup_exception_handlers
from apps.users.api import router as users_router
from apps.products.api import router as products_router

api = NinjaAPI(
    title="Core Enterprise API",
    version="1.0.0",
    description="Documentação interativa da API Django Ninja",
    docs_url="/docs",
    openapi_url="/openapi.json",
    csrf=False,  # APIs stateless baseadas em Bearer Token / JWT
)

# Registro de Handlers Globais de Erro
setup_exception_handlers(api)

# Registro Modular de Routers
api.add_router("/users", users_router)
api.add_router("/products", products_router)
```

---

### 3.2. Schemas Pydantic (Entrada, Atualização, Saída e Filtros)

```python
# apps/products/schemas.py
from datetime import datetime
from decimal import Decimal
from uuid import UUID
from ninja import Schema, Field, FilterSchema
from pydantic import ConfigDict

# 1. Entrada / Criação (Payload estrito)
class ProductCreateIn(Schema):
    title: str = Field(..., min_length=3, max_length=200, example="Monitor 27 4K")
    slug: str = Field(..., max_length=250, example="monitor-27-4k")
    price: Decimal = Field(..., gt=0, decimal_places=2, example="1899.90")
    category_id: int = Field(..., description="ID da categoria associada")
    is_active: bool = True

# 2. Atualização Parcial (PATCH)
class ProductUpdateIn(Schema):
    title: str | None = Field(None, min_length=3, max_length=200)
    price: Decimal | None = Field(None, gt=0, decimal_places=2)
    is_active: bool | None = None

# 3. Saída / Resposta (Com resolução ORM Pydantic v2)
class CategoryOut(Schema):
    id: int
    name: str

class ProductOut(Schema):
    id: UUID
    title: str
    slug: str
    price: Decimal
    is_active: bool
    category: CategoryOut
    created_at: datetime
    updated_at: datetime

    # Compatibilidade Pydantic v2 com objetos Django ORM
    model_config = ConfigDict(from_attributes=True)

# 4. Filtros Dinâmicos
class ProductFilterSchema(FilterSchema):
    search: str | None = Field(None, q=["title__icontains", "slug__icontains"])
    category_id: int | None = None
    min_price: Decimal | None = Field(None, q="price__gte")
    max_price: Decimal | None = Field(None, q="price__lte")
    is_active: bool | None = None
```

---

### 3.3. Router e Operações CRUD Completas

```python
# apps/products/api.py
from uuid import UUID
from django.shortcuts import get_object_or_404
from ninja import Router, Query
from ninja.pagination import paginate, PageNumberPagination
from apps.core.auth import JWTAuthBearer
from apps.core.schemas import ErrorOut
from apps.products.models import Product
from apps.products.schemas import (
    ProductCreateIn,
    ProductUpdateIn,
    ProductOut,
    ProductFilterSchema,
)
from apps.products.services import product_service

router = Router(tags=["Products"], auth=JWTAuthBearer())

@router.get("", response=list[ProductOut], summary="Listar produtos")
@paginate(PageNumberPagination, page_size=20)
def list_products(request, filters: Query[ProductFilterSchema]):
    qs = Product.objects.select_related("category").all()
    return filters.filter(qs)

@router.get("/{product_id}", response={200: ProductOut, 404: ErrorOut}, summary="Obter produto por ID")
def get_product(request, product_id: UUID):
    product = get_object_or_404(
        Product.objects.select_related("category"),
        id=product_id
    )
    return 200, product

@router.post("", response={201: ProductOut, 400: ErrorOut}, summary="Criar produto")
def create_product(request, payload: ProductCreateIn):
    try:
        product = product_service.create_product(payload, created_by=request.auth)
        return 201, product
    except ValueError as err:
        return 400, {"detail": str(err), "code": "VALIDATION_ERROR"}

@router.patch("/{product_id}", response={200: ProductOut, 404: ErrorOut}, summary="Atualização parcial de produto")
def update_product(request, product_id: UUID, payload: ProductUpdateIn):
    product = get_object_or_404(Product, id=product_id)
    updated = product_service.update_product(product, payload)
    return 200, updated

@router.delete("/{product_id}", response={204: None, 404: ErrorOut}, summary="Excluir produto")
def delete_product(request, product_id: UUID):
    product = get_object_or_404(Product, id=product_id)
    product_service.delete_product(product)
    return 204, None
```

---

### 3.4. Autenticação Segura (Bearer / JWT)

```python
# apps/core/auth.py
from typing import Any
import jwt
from django.conf import settings
from django.contrib.auth import get_user_model
from ninja.security import HttpBearer

User = get_user_model()

class JWTAuthBearer(HttpBearer):
    def authenticate(self, request, token: str) -> Any | None:
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
            user_id = payload.get("user_id")
            if not user_id:
                return None
            user = User.objects.filter(id=user_id, is_active=True).first()
            return user  # Disponível em request.auth
        except Exception:
            return None
```

---

### 3.5. Tratamento de Exceções Global

```python
# apps/core/exceptions.py
from ninja import NinjaAPI
from ninja.errors import ValidationError, HttpError
from django.http import JsonResponse

class BusinessError(Exception):
    def __init__(self, message: str, code: str = "BUSINESS_ERROR"):
        self.message = message
        self.code = code
        super().__init__(message)

def setup_exception_handlers(api: NinjaAPI):
    @api.exception_handler(ValidationError)
    def handle_validation_error(request, exc: ValidationError):
        return JsonResponse(
            {
                "success": False,
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Erro de validação nos dados enviados.",
                    "details": exc.errors,
                }
            },
            status=422
        )

    @api.exception_handler(BusinessError)
    def handle_business_error(request, exc: BusinessError):
        return JsonResponse(
            {
                "success": False,
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                }
            },
            status=400
        )
```

---

### 3.6. Testes Automatizados com `TestClient`

```python
# apps/products/tests/test_api.py
import pytest
from ninja.testing import TestClient
from config.api import api
from apps.products.models import Category

@pytest.fixture
def client():
    return TestClient(api)

@pytest.fixture
def auth_headers(django_user_model):
    user = django_user_model.objects.create_user(username="ninja_test", password="pwd")
    token = "test-token"
    return {"HTTP_AUTHORIZATION": f"Bearer {token}"}

@pytest.mark.django_db
def test_create_product_success(client, auth_headers):
    category = Category.objects.create(name="Hardware")
    payload = {
        "title": "SSD NVMe 1TB",
        "slug": "ssd-nvme-1tb",
        "price": "450.00",
        "category_id": category.id,
        "is_active": True
    }
    
    response = client.post("/products", json=payload, headers=auth_headers)
    assert response.status_code == 201
    assert response.json()["title"] == "SSD NVMe 1TB"
```

---

## ⚡ 4. Checklist de Performance & Qualidade

- [ ] **Prevenção de N+1**: Relações ForeignKey usam `select_related()` e ManyToMany usam `prefetch_related()`.
- [ ] **Paginação**: Todas as listagens de coleções usam `@paginate` ou limites estritos.
- [ ] **ConfigDict ORM**: Todo schema de saída de Model Django possui `model_config = ConfigDict(from_attributes=True)`.
- [ ] **OpenAPI Declarado**: `summary`, `description` e códigos de status HTTP 200/201/204/400/404 explícitos.
- [ ] **Testes de Integração**: Cobertura de sucesso (200/201), validação (422) e autorização (401/403) usando `TestClient`.

---

## 📚 5. Documentação Offline de Referência

A documentação completa oficial do Django Ninja está disponível localmente para consulta neste skill:
- **Arquivo Único Consolidado**: `references/django_ninja_complete.md`
- **Índice Estruturado**: `references/index.json`
- **Capítulos Individuais**: `references/pages/`
