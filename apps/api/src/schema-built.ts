import { makeExecutableSchema } from '@graphql-tools/schema';
import { typeDefs, resolvers } from './graphql';

export const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});
