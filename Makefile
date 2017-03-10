SHELL = /bin/bash -O globstar

FAB = fab -f ./deploy/fabfile.py

# Lint configuration
LINTER = ./node_modules/.bin/standard

# Test runners
KARMA = ./node_modules/.bin/karma
PROTRACTOR = ./node_modules/.bin/protractor
WEBDRIVER = ./node_modules/.bin/webdriver-manager

# File watcher
WATCHER = ./node_modules/.bin/watchify

# JS minifier
UGLIFY = ./node_modules/.bin/uglifyjs
UGLIFY_FLAGS = --compress \
			   --screw-ie8 \
			   -o $(JS_DEST_DIR)/main.js

# Browserify configuration
BROWSERIFY = ./node_modules/.bin/browserify
BROWSWER_MAIN = app/js/main.js
BROWSERIFY_FLAGS = -o $(JS_DEST_DIR)/main.js \
				   -t babelify \
				   -t browserify-ngannotate \
				   -t brfs \
				   -t bulkify

# Sass configuration
SASS = ./node_modules/.bin/node-sass
SASS_MAIN = app/styles/main.scss
SASS_FLAGS = --output $(CSS_DEST_DIR) \
			 --source-map $(CSS_DEST_DIR) \
			 --quiet \
			 --output-style compressed

EXTERNAL_CSS = node_modules/bootstrap/dist/css/bootstrap.min.css \
			   node_modules/angular-ui-bootstrap/dist/ui-bootstrap-csp.css \
			   node_modules/angular-loading-bar/build/loading-bar.min.css \
			   node_modules/angular-toastr/dist/angular-toastr.min.css \
			   node_modules/ui-select/dist/select.min.css \
			   node_modules/font-awesome/css/font-awesome.min.css \
			   node_modules/codemirror/lib/codemirror.css \
			   node_modules/codemirror/addon/lint/lint.css \
			   node_modules/highlight.js/styles/github.css \
			   node_modules/ng-tags-input/build/ng-tags-input.min.css

# Fonts
EXTERNAL_FONTS = node_modules/font-awesome/fonts/*.{eot,ttf,woff,woff2,svg} \
				 node_modules/bootstrap/dist/fonts/*

# Js libraries
EXTERNAL_JS = node_modules/codemirror/mode/javascript/javascript.js \
			  node_modules/codemirror/addon/display/autorefresh.js \
			  node_modules/dagre/dist/dagre.min.js \
			  node_modules/linkurious/dist/plugins.js \
			  node_modules/linkurious/dist/sigma.js \
			  node_modules/jspdf/dist/jspdf.min.js \
			  node_modules/codemirror/mode/groovy/groovy.js

SCRIPTS := $(shell find app server -type f -name '*.js')
IMAGES := app/images/*

# Helpers
MOCHA = ./node_modules/.bin/mocha
NODEMON = ./node_modules/.bin/nodemon
PM2 = ./node_modules/.bin/pm2

INPUT_DIR = app
OUTPUT_DIR = build
INDEX_HTML = $(INPUT_DIR)/index.html
JS_DEST_DIR = $(OUTPUT_DIR)/js
CSS_DEST_DIR = $(OUTPUT_DIR)/css
IMG_DEST_DIR = $(OUTPUT_DIR)/images
FONT_DEST_DIR = $(OUTPUT_DIR)/fonts

# Production
prod: node_modules clean copy js_min css

# Development
dev: node_modules clean copy js css

# Keeping the source maps
js:
	@$(BROWSERIFY) $(BROWSERIFY_FLAGS) --debug $(BROWSWER_MAIN)

# Remove the source maps and minify the script
js_min:
	@$(BROWSERIFY) $(BROWSERIFY_FLAGS) $(BROWSWER_MAIN)
	@$(UGLIFY) $(JS_DEST_DIR)/main.js $(UGLIFY_FLAGS) 2>/dev/null

css:
	@$(SASS) $(SASS_FLAGS) $(SASS_MAIN)

watchify:
	@$(WATCHER) $(BROWSERIFY_FLAGS) --debug $(BROWSWER_MAIN)

watch-css:
	@$(SASS) $(SASS_FLAGS) -w $(INPUT_DIR)/styles $(SASS_MAIN)

lint:
	@$(LINTER) $(SCRIPTS)

unit:
	@$(KARMA) start ./test/karma.conf.js

e2e:
	@$(WEBDRIVER) update
	@$(PROTRACTOR) ./test/protractor.conf.js

test-server-apis:
	@$(MOCHA) -w test/server/apis/*.js -R min --timeout 5000

test-server-utils:
	@$(MOCHA) -w test/server/utils/*.js -R min --timeout 5000

server:
	@$(NODEMON) -q server/app.js

install:
	@time npm i

copy:
	@mkdir -p $(OUTPUT_DIR)/{js,css,fonts,images}
	@cp $(EXTERNAL_CSS) $(CSS_DEST_DIR)
	@cp $(IMAGES) $(IMG_DEST_DIR)
	@cp $(EXTERNAL_FONTS) $(FONT_DEST_DIR)
	@cp $(EXTERNAL_JS) $(JS_DEST_DIR)
	@cp $(INDEX_HTML) $(OUTPUT_DIR)

clean:
	@rm -rf $(OUTPUT_DIR)

purge: clean
	@rm -rf node_modules

# Deployment
deploy-app:
	$(FAB) web_server deploy_web_app

.PHONY: server
