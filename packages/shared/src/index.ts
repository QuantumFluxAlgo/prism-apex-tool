export type Placeholder = {
  readonly message: string;
};

export function hello(name: string): string {
  return `Hello, ${name}!`;
}
