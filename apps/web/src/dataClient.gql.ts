import { jfetch, type DataClient, type Todo } from './dataClient';

async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const payload = await jfetch<{ data?: T; errors?: { message: string }[] }>('/graphql', {
        method: 'POST',
        body: { query, variables },
      });
      if (payload.errors?.length) throw new Error(payload.errors[0].message || 'GraphQL error');
      return payload.data as T;
}

export const gqlClient: DataClient = {
  async listTodos() {
    const data = await gql<{ todos: Todo[] }>(`query { todos { id title completed } }`);
    return data.todos;
  },
  async createTodo(title: string) {
    const data = await gql<{ createTodo: Todo }>(
      `mutation($title: String!) { createTodo(title: $title) { id title completed } }`,
      { title }
    );
    return data.createTodo;
  },
  async updateTodo(id: number, patch: Partial<Pick<Todo,'title'|'completed'>>) {
    const data = await gql<{ updateTodo: Todo }>(
      `mutation($id:Int!, $title:String, $completed:Boolean){
         updateTodo(id:$id, title:$title, completed:$completed){ id title completed }
       }`,
      { id, ...patch }
    );
    return data.updateTodo;
  },
  async deleteTodo(id: number) {
    await gql<{ deleteTodo: boolean }>(
      `mutation($id:Int!){ deleteTodo(id:$id) }`,
      { id }
    );
  },
};
