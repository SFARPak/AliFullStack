import { getGithubUser } from "../handlers/github_handlers";

export async function getGitAuthor() {
  const user = await getGithubUser();
  const author = user
    ? {
        name: `[alifullstack]`,
        email: user.email,
      }
    : {
        name: "[alifullstack]",
        email: "git@alifullstack.alitech.io",
      };
  return author;
}
