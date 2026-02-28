import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import * as dotenv from 'dotenv';
dotenv.config();

export interface JwtPayload {
    sub: string; // userId
    tenantId: string;
    role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_SECRET || 'doodh-dukan-secret',
        });
    }

    async validate(payload: JwtPayload) {
        return {
            userId: payload.sub,
            tenantId: payload.tenantId,
            role: payload.role,
        };
    }
}
