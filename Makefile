push:
	git add -A 
	git commit -m "auto"
	git push gitcafe gh-pages:gitcafe-pages --force
	git push github gh-pages:gh-pages --force