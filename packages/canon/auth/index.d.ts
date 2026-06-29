interface AuthenticatedPageLoaderOptions {
  loginUrl?: string;
}

export declare function createAuthenticatedPageLoader<T extends { email: string } = { email: string }>(
  options?: AuthenticatedPageLoaderOptions
): ({ locals }: { locals: { user?: T } }) => Promise<{ user: { email: string } }>;
