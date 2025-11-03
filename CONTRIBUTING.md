# Contributing to tldw Browser_Assistant

Thank you for your interest in contributing to tldw Browser_Assistant! We welcome contributions from anyone, whether it's reporting bugs, suggesting improvements, or submitting code changes.

## Getting Started

1. **Fork the repository**

   To start contributing, fork this repository on GitHub by clicking the "Fork" button at the top right of the page.

2. **Clone your forked repository**

   Once you have your own fork, clone it to your local machine:

   ```
   git clone https://github.com/YOUR-USERNAME/REPO-NAME.git
   ```

3. **Install dependencies**

   This project uses [Bun](https://bun.sh/) (or Node) for dependency management. Install the required dependencies by running the following command in the project root directory:

   ```
   bun install
   ```

   If you face any issues with Bun, you can use `npm` instead.

4. **Start the development server**

   To run the extension in development mode, use the following command:

   ```
   bun dev
   ```

   This starts the WXT dev server for Chrome.

   For Firefox:

   ```
   bun run dev:firefox
   ```

5. **Connect to your tldw_server**

   tldw Browser_Assistant is a frontend for `tldw_server`. Make sure you have a local or remote instance running and configure the server URL and authentication in the extension Options page.

## Making Changes

Once you have the project set up locally, you can start making changes. We recommend creating a new branch for your changes:

```
git checkout -b my-feature-branch
```

Make your desired changes, and don't forget to add or update tests if necessary.

## Submitting a Pull Request

1. **Commit your changes**

   Once you've made your changes, commit them with a descriptive commit message:

   ```
   git commit -m "Add a brief description of your changes"
   ```

2. **Push your changes**

   Push your changes to your forked repository:

   ```
   git push origin my-feature-branch
   ```

3. **Open a Pull Request**

   Go to the original repository on GitHub and click the "New Pull Request" button. Select your forked repository and the branch you just pushed as the source, and the main repository's `main` branch as the destination.

4. **Describe your changes**

   Provide a clear and concise description of the changes you've made, including any relevant issue numbers or other context.

5. **Review and merge**

   The maintainers of the project will review your pull request and provide feedback or merge it if everything looks good.

## Code Style and Guidelines

To ensure consistency and maintainability, please:

- Use Prettier (with import sorting): `bunx prettier --write .`
- Run type checks before PRs: `bun run compile`
- Follow best practices for TypeScript/React and TailwindCSS

## Need Help?

If you have any questions or need further assistance, feel free to open an issue or reach out to the maintainers.

## Attribution

This project was refactored from the original Page Assist extension. We’re grateful for that work and community.

Thank you for your contribution!
