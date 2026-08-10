import dns from "dns";

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectDB } from "./db";
import AdminUser from "./models/AdminUser";

// dns.setServers(["8.8.8.8", "8.8.4.4"]);

if (process.env.NODE_ENV === "development") {
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
}


export const { handlers, auth, signIn, signOut } = NextAuth({
  // Admin runs on a custom subdomain (adminpanel.lovetap.me) as well as the
  // apex, so trust the incoming host for auth callback/cookie resolution.
  trustHost: true,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
  try {

    if (!credentials?.email || !credentials?.password) {
      return null;
    }

    const email = String(credentials.email).trim().toLowerCase();
    const password = String(credentials.password);


    await connectDB();

    const user = await AdminUser.findOne({ email });

    if (!user) {
      return null;
    }


    const isValid = await bcrypt.compare(
      password,
      user.password
    );


    if (!isValid) {
      return null;
    }


    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
    };
  } catch (error) {
    return null;
  }
},
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    // Persist the admin's DB id in the JWT and expose it on the session, so
    // admin APIs identify the account by id (stable even if the email changes).
    jwt({ token, user }) {
      if (user?.id) token.uid = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.uid && session.user) {
        (session.user as { id?: string }).id = token.uid as string;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnLogin = nextUrl.pathname === "/login";

      if (isOnLogin) {
        if (isLoggedIn) return Response.redirect(new URL("/", nextUrl));
        return true;
      }

      return isLoggedIn;
    },
  },
});
