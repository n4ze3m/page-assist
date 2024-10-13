# Contributing to Page Assist

Thank you for your interest in contributing to Page Assist! We welcome contributions from anyone, whether it's reporting bugs, suggesting improvements, or submitting code changes.

## Getting Started

1. **Fork the repository**

   To start contributing, you'll need to fork the [Page Assist repository](https://github.com/n4ze3m/page-assist) by clicking the "Fork" button at the top right of the page.

2. **Clone your forked repository**

   Once you have your own fork, clone it to your local machine:

   ```
   git clone https://github.com/YOUR-USERNAME/page-assist.git
   ```

3. **Install dependencies**

   Page Assist uses [Bun](https://bun.sh/) for dependency management. Install the required dependencies by running the following command in the project root directory:

   ```
   bun install
   ```

4. **Start the development server**

   To run the extension in development mode, use the following command:

   ```
   bun dev
   ```

   This will open a  chrome browser window with the extension loaded.

   for firefox:

   ```
   bun dev:firefox
   ```

5. **Install Ollama locally**

   Page Assist requires [Ollama](https://ollama.ai) to be installed locally. Follow the installation instructions provided in the Ollama repository.

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

To ensure consistency and maintainability, we follow certain code style guidelines. Please ensure your code adheres to these guidelines before submitting a pull request.

- Use proper indentation and code formatting
- Write clear and concise comments when necessary
- Follow best practices for TypeScript and React development

## Need Help?

If you have any questions or need further assistance, feel free to open an issue or reach out to the maintainers.

Thank you for your contribution!
