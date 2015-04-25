set /p info=commit–≈œ¢:
git add *
git commit -m %info%
git push github static:static
git push oschina static:static
git push coding static:static
pause