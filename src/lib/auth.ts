import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    signIn({ user }) {
      return user.email === process.env.AUTHORIZED_EMAIL;
    },
    async jwt({ token, account }) {
      if (account?.access_token) {
        try {
          const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: { Authorization: `Bearer ${account.access_token}` },
          });
          const userInfo = await res.json();
          if (userInfo.picture) {
            token.picture = userInfo.picture;
          }
        } catch {}
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.image = (token.picture as string) || null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});
