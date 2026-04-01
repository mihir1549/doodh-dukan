import { BadRequestException, ConflictException } from '@nestjs/common';
import { EntrySlot, SourceChannel } from './daily-entry.entity';
import { EntriesService } from './entries.service';
import { UserRole } from '../users/user.entity';

describe('EntriesService', () => {
    const tenantId = 'tenant-1';
    const customerId = 'customer-1';
    const productId = 'product-1';
    const userId = 'user-1';
    const createdAt = new Date('2026-04-01T10:30:00.000Z');

    let entryRepo: { findOne: jest.Mock; find: jest.Mock };
    let summaryRepo: { findOne: jest.Mock };
    let productsService: { getPriceForDate: jest.Mock };
    let queryRunner: {
        connect: jest.Mock;
        startTransaction: jest.Mock;
        commitTransaction: jest.Mock;
        rollbackTransaction: jest.Mock;
        release: jest.Mock;
        manager: {
            create: jest.Mock;
            save: jest.Mock;
        };
    };
    let dataSource: { createQueryRunner: jest.Mock };
    let service: EntriesService;

    const buildSavedEntry = (overrides: Record<string, any> = {}) => ({
        id: 'entry-1',
        tenant_id: tenantId,
        customer_id: customerId,
        product_id: productId,
        entry_date: '2026-04-01',
        quantity: 2,
        unit_price: 54,
        line_total: 108,
        source: SourceChannel.SHOP,
        entry_slot: EntrySlot.MORNING,
        created_by_user_id: userId,
        month_year: '2026-04',
        created_at: createdAt,
        ...overrides,
    });

    beforeEach(() => {
        jest.useFakeTimers().setSystemTime(new Date('2026-04-01T09:00:00.000Z'));

        entryRepo = {
            findOne: jest.fn().mockResolvedValue(null),
            find: jest.fn().mockResolvedValue([]),
        };

        summaryRepo = {
            findOne: jest.fn().mockResolvedValue(null),
        };

        productsService = {
            getPriceForDate: jest.fn().mockResolvedValue({ price_per_unit: 54 }),
        };

        queryRunner = {
            connect: jest.fn().mockResolvedValue(undefined),
            startTransaction: jest.fn().mockResolvedValue(undefined),
            commitTransaction: jest.fn().mockResolvedValue(undefined),
            rollbackTransaction: jest.fn().mockResolvedValue(undefined),
            release: jest.fn().mockResolvedValue(undefined),
            manager: {
                create: jest.fn().mockImplementation((_: unknown, payload: unknown) => payload),
                save: jest.fn().mockImplementation(async (payload: unknown) => ({
                    ...buildSavedEntry(),
                    ...(payload as Record<string, unknown>),
                    created_at: createdAt,
                })),
            },
        };

        dataSource = {
            createQueryRunner: jest.fn().mockReturnValue(queryRunner),
        };

        service = new EntriesService(
            entryRepo as any,
            summaryRepo as any,
            productsService as any,
            dataSource as any,
        );

        jest
            .spyOn(service as any, 'recalculateSummary')
            .mockResolvedValue(undefined);
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    it('creates an entry with today as the default entry date', async () => {
        const result = await service.create(tenantId, userId, UserRole.SHOP_STAFF, {
            customer_id: customerId,
            product_id: productId,
            quantity: 2,
            entry_slot: EntrySlot.MORNING,
        });

        expect(queryRunner.manager.create).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                entry_date: '2026-04-01',
            }),
        );
        expect(result.entry_date).toBe('2026-04-01');
    });

    it('creates a backdated entry successfully', async () => {
        const result = await service.create(tenantId, userId, UserRole.DELIVERY, {
            customer_id: customerId,
            product_id: productId,
            quantity: 1.5,
            entry_date: '2026-03-31',
            entry_slot: EntrySlot.MORNING,
        });

        expect(productsService.getPriceForDate).toHaveBeenCalledWith(
            tenantId,
            productId,
            '2026-03-31',
        );
        expect(result.entry_date).toBe('2026-03-31');
    });

    it('rejects a future-dated entry', async () => {
        await expect(
            service.create(tenantId, userId, UserRole.SHOP_STAFF, {
                customer_id: customerId,
                product_id: productId,
                quantity: 2,
                entry_date: '2026-04-02',
            }),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('returns structured duplicate metadata instead of inserting silently', async () => {
        entryRepo.findOne.mockResolvedValueOnce(buildSavedEntry());

        try {
            await service.create(tenantId, userId, UserRole.SHOP_STAFF, {
                customer_id: customerId,
                product_id: productId,
                quantity: 2,
                entry_date: '2026-04-01',
            });
            fail('Expected duplicate create to throw');
        } catch (error) {
            expect(error).toBeInstanceOf(ConflictException);
            expect((error as ConflictException).getResponse()).toEqual(
                expect.objectContaining({
                    code: 'DUPLICATE_ENTRY',
                    duplicate: expect.objectContaining({
                        customer_id: customerId,
                        product_id: productId,
                        entry_date: '2026-04-01',
                        source: SourceChannel.SHOP,
                    }),
                }),
            );
        }

        expect(queryRunner.manager.save).not.toHaveBeenCalled();
    });

    it('stores created_at automatically from the saved record', async () => {
        const result = await service.create(tenantId, userId, UserRole.SHOP_STAFF, {
            customer_id: customerId,
            product_id: productId,
            quantity: 2,
            entry_date: '2026-04-01',
        });

        expect(result.created_at).toEqual(createdAt);
    });

    it('stores created_by_user_id from the authenticated user', async () => {
        const result = await service.create(tenantId, userId, UserRole.SHOP_STAFF, {
            customer_id: customerId,
            product_id: productId,
            quantity: 2,
            entry_date: '2026-04-01',
        });

        expect(queryRunner.manager.create).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                created_by_user_id: userId,
            }),
        );
        expect(result.created_by_user_id).toBe(userId);
    });

    it('assigns DELIVERY source automatically from role context', async () => {
        const result = await service.create(tenantId, userId, UserRole.DELIVERY, {
            customer_id: customerId,
            product_id: productId,
            quantity: 2,
            entry_date: '2026-04-01',
        });

        expect(queryRunner.manager.create).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                source: SourceChannel.DELIVERY,
            }),
        );
        expect(result.source).toBe(SourceChannel.DELIVERY);
    });
});
