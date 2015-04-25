set /p info=commit–≈œ¢:
git add *
git commit -m "%info%"
git push github static:static
git push oschina static:static
git push coding static:static
cd ./dist/client
git add *
git commit -m "auto upload"
git push github master:gh-pages
git push gitcafe master:gitcafe-pages
pause