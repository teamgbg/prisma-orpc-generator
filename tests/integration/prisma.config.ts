import { defineConfig } from '@prisma/config';

export default defineConfig({
  schema: './behavior-harness.prisma',
  datasource: {
    url: 'file:./behavior.db',
  },
});
