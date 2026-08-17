import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Aplicado nas rotas protegidas. Não confiar apenas na UI —
// toda rota sensível DEVE usar este guard (ou o RolesGuard) no backend.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
