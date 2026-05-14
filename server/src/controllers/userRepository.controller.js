import { getUserGitHubRepositories, getRegisteredRepositories } from "../services/userRepository.service.js";

export async function getUserReposHandler(req, res, next) {
  try {
    const accountId = req.accountId;

    // Fetch repos from GitHub
    const githubRepos = await getUserGitHubRepositories(accountId);

    // Get already registered repos from our DB
    const registeredRepos = await getRegisteredRepositories(accountId);

    const reposWithStatus = githubRepos.map((repo) => ({
      ...repo,
      isRegistered: registeredRepos.has(`${repo.owner}/${repo.name}`),
    }));

    res.json({ repositories: reposWithStatus });
  } catch (error) {
    next(error);
  }
}
