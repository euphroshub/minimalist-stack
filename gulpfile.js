const { series, parallel, src, dest, watch } = require("gulp");
const del = require('del');

// Gulp libs
const uglify = require('gulp-uglify');
const sourcemaps = require('gulp-sourcemaps');
const rename = require('gulp-rename');
const sass = require('gulp-sass')(require('sass'));
const webp = require('gulp-webp');
const imagemin = require('gulp-imagemin')
const cleanCSS = require('gulp-clean-css');
const plumber = require("gulp-plumber")
const autoprefixer = require('gulp-autoprefixer');

//Transpile ES Modules to es2015
const gulpEsbuild = require('gulp-esbuild')

// Used to access files currently in gulp's stream
const buffer = require('vinyl-buffer');

// used to create a local server
const http = require('http');
const st = require('st');

// used for livereloading when using local server
const browserSync = require('browser-sync').create();

// where to output assets
const outputDir = './dist/assets/';

// As all gulp functions
// Each function must either return the gulp stream
// or execute a callback function eg. done() or cb()

// Used to empty the output directory
function clean() {
return del('dist/**/*');
}

// compiling style.scss and all .scss files in the components directory
// each file will be outputed as a css file
// perfect for your components

function styles() {
return src(['./app/scss/style.scss', './app/scss/components/**/*.scss'])
    .pipe(sass())
    .on("error", sass.logError)
    .pipe(autoprefixer({
    cascade: false,
    flexbox: false
    }))
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(sourcemaps.write('./'))
    .pipe(dest(outputDir))
    .pipe(browserSync.stream())
}

// used to transpile the main app script

function app() {

return src('./app/js/app.js')
    .pipe(gulpEsbuild({
    outfile: 'app.js',
    bundle: true,
    }))
    .pipe(plumber())
    .pipe(buffer())
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(sourcemaps.write('./'))
    .pipe(dest(outputDir))
}

// same process than app()
// but applied to all .js files in the components folder
// will output a transpiled .js file for each component file
function components(done) {
//get every js file
return src(['./app/js/components/**.js'])
    .pipe(gulpEsbuild({
        bundle: true,
    }))
    .pipe(buffer())
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(sourcemaps.write('./'))
    .pipe(dest(outputDir));
}

// used to minify all JS files in /dist
// (used only in production)
function minifyJS() {
    // get every js file in /dist then uglify them
    return src('dist/**/*.js')
    .pipe(buffer())
    .pipe(rename({ extname: '.min.js' }))
    .pipe(uglify())
    .pipe(dest('./dist'));
}

// used to minify all CSS files in /dist
// (used only in production)
function minifyCSS() {
    // get every css file in /dist then minify them
    return src('dist/**/*.css')
    .pipe(buffer())
    .pipe(rename({ extname: '.min.css' }))
    .pipe(cleanCSS())
    .pipe(dest('./dist'));
}

// simply copying all html templates in the dist folder
// must be done for browser sync to work
function html() {
    return src('./app/templates/*.html')
    .pipe(dest('./dist'))
}

// optimize and copy the static images to /dist/img
// must be run at least once to have images in dist/img folder
function images() {
    return src('./app/images/**/*')
    .pipe(imagemin({options: {verbose: true}}))
    .pipe(dest(outputDir+'images'))
}

// optimize and copy the static svgs to /dist/svg
// must be run at least once to have images in dist/svg folder
function svg() {
    return src('./src/svg/**/*')
    .pipe(dest(outputDir+'svg'))
}

// creates webp images
// must be run at least once to have webp in dist/img/webp
function images_webp() {
    return src(['./app/images/**/*', '!./app/images/favicon/**/*'])
    .pipe(webp())
    .pipe(dest(outputDir + 'webp'))
}

// create a localserver using the html template files
// perfect for your styleguide
function serve(done) {
    // creating a local server using /dist as root
    http.createServer(
        st({ path: __dirname + '/dist', index: 'index.html', cache: false })
    ).listen(8080, done);

    // initing browsersync for live reloads
    browserSync.init({
        server: {
        baseDir: "./dist"
        }
    });

    // callback
    done()
}

// flags browser sync to reload the page
// (if active)
function reload(done) {
    browserSync.reload()

    done();
}

// watching filechanges
function watchfiles(done) {

    // execute html task, then reload the whole page
    watch('./app/templates/**/*.html', series(html, reload))

    // execute scss task, then inject css
    watch(['./app/scss/**/*.scss'], styles)

    // exceute appropriate js task, then reload the whole page
    watch(['./app/js/**/*.js', '!./src/js/{components,components/**}'], series(app, reload))
    watch(['./app/js/components/**/*.js'], series(components, reload))

    done()
}

// exporting basic tasks
// execute "gulp [taskname]" in your terminal
exports.clean = clean
exports.webp = images_webp
exports.images = images
exports.svg = svg
exports.html = html
exports.styles = styles
exports.app = app
exports.components = components


// exporting main tasks
// execute "gulp [taskname]" in your terminal
exports.default = series( clean, parallel( html, styles, app, components, images, images_webp, svg ) )
exports.build = series( clean, parallel( html, styles, app, components, images, images_webp, svg ) )
exports.serve = series( series( clean, parallel( html, styles, app, components, images, images_webp, svg ) ), serve, watchfiles )
exports.watch = series( series( clean, parallel( html, styles, app, components, images, images_webp, svg ) ), watchfiles )
exports.production = series( series( clean, parallel( html, styles, app, components, images, images_webp, svg ) ), parallel(minifyCSS, minifyJS) );