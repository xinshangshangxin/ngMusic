addandpush:
	git add -A
	git commit -m "$m"
	git push github master
	git push oschina master
	git push coding master
codingTest:
	git add -A
	git commit -m "test"
	git push coding master