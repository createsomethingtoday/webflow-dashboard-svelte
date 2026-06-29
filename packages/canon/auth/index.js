import { redirect } from '@sveltejs/kit';

export function createAuthenticatedPageLoader(options = {}) {
  const { loginUrl = '/login' } = options;

  return async ({ locals }) => {
    if (!locals.user) {
      redirect(302, loginUrl);
    }

    return {
      user: {
        email: locals.user.email
      }
    };
  };
}
