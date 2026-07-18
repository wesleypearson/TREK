import { Module } from '@nestjs/common';
import { UpdatesController } from './updates.controller';

/** Crew-visible release notes domain (L2 leaf module). Registered in AppModule. */
@Module({
  controllers: [UpdatesController],
})
export class UpdatesModule {}
