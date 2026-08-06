
# Import into GitHub

## Browser method

1. Create a new private repository in the company organization.
2. Extract the delivered repository ZIP locally.
3. In the empty GitHub repository, choose **uploading an existing file**.
4. Drag the extracted contents into the upload area.
5. Commit to `main`.

For a repository this size, Git command line is more reliable:

```bash
git init
git add .
git commit -m "Initial Land Master engineering baseline"
git branch -M main
git remote add origin <company-repository-url>
git push -u origin main
```

Confirm that the uploaded baseline ZIPs remain binary and the 2 MB `.ds` file is present.
