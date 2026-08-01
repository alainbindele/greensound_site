/**
 * Whether an account may use the admin pages.
 *
 * The role lives in the database (`users.role`), set when the account is
 * created with `npm run admin`. This check only decides what the UI shows —
 * the API enforces the same rule server-side on every write, so hiding a
 * button is never what keeps data safe.
 */
export const isAdmin = (user) => user?.role === 'admin';
