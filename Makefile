REPORTER = spec

test:
	$(info verifying code lintin and applying Unit Tests:)
	@./node_modules/.bin/xo
	@./node_modules/.bin/mocha \
		--reporter $(REPORTER) \
		--require should \
		--recursive \
		test

build:
	npm run build

.PHONY: test
