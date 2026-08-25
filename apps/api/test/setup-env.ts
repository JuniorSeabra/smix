// Segredos exclusivos da suíte de testes. Precisam ter 32+ caracteres porque
// requireJwtSecret/requireRefreshSecret recusam segredo curto — a própria regra
// que estamos testando indiretamente aqui.
process.env.JWT_SECRET = 'test-secret-com-mais-de-32-caracteres-aqui';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-com-mais-de-32-caracteres';
process.env.JWT_EXPIRES_IN = '15m';
process.env.WEB_ORIGIN = 'http://localhost:3000';
process.env.TRUST_PROXY_HOPS = '1';
process.env.PUBLIC_SIGNUP_ENABLED = 'false';
process.env.REQUIRE_SUBSCRIPTION = 'true';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
