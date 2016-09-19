module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    secrets: grunt.file.readJSON('secrets.json'),
    paths: {
      src:        'src',
      src_img:    'src/images',
      dist:       'dist',
      dist_img:   'dist/images',
      preview:    'preview'
    },

    // Compiles and Minifies CSS, SASS, SCSS
    sass: {
      dev: {
        options: {
         style: 'expanded', //Use loud scss comments </*! Comment */> to preserve scss comments.
        },
        files: {
          '<%= paths.src %>/style-human.css': '<%= paths.src %>/scss/main-style.scss'
        }
      },
      dist: {
        options: {
          style: 'compressed',
        },
        files: {
          '<%= paths.src %>/style.css': '<%= paths.src %>/scss/main-style.scss',
        }
      }
    },

    // Fixes browser errors by prefixing compiled CSS
    autoprefixer: {
      options: {
        browsers: ['last 6 versions', '> 1%', 'ie 9']
      },
      multiple_file: {
        options: {
          map: {
            inline: false
          }
        },
        expand: true,
        flatten: true,
        src: '<%= paths.src %>/*.css',
        dest: '<%= paths.dist %>'
      }
    },

    // Optimize images
    imagemin: {
      png: {
        options: {
          optimizationLevel: 4
        },
        files: [
        {
          // Set to true to enable the following options…
          expand: true,
          // cwd is 'current working directory'
          cwd: '<%= paths.src_img %>',
          src: ['*.png'],
          // Could also match cwd line above. i.e. images/
          dest: '<%= paths.dist_img %>',
          ext: '.png'
        }]
      },
      jpg: {
        options: {
          progressive: true
        },
        files: [
        {
          // Set to true to enable the following options…
          expand: true,
          // cwd is 'current working directory'
          cwd: '<%= paths.src_img %>/',
          src: ['*.jpg'],
          // Could also match cwd. i.e. images/
          dest: '<%= paths.dist_img %>',
          ext: '.jpg'
        }]
      }
    },

    // Assembles your email content with HTML layout
    assemble: {
      options: {
        layoutdir: '<%= paths.src %>/layouts',
        partials: ['<%= paths.src %>/partials/**/*.hbs'],
        helpers: ['<%= paths.src %>/helpers/**/*.js'],
        data: ['<%= paths.src %>/data/*.{json,yml}'],
        flatten: true
      },
      pages: {
        src: ['<%= paths.src %>/emails/*.hbs'],
        dest: '<%= paths.dist %>/'
      }
    },

    // Use Amazon S3 for images. Run grunt s3upload
    aws_s3: {
      options: {
        accessKeyId: '<%= secrets.s3.key %>',
        secretAccessKey: '<%= secrets.s3.secret %>',
        region: '<%= secrets.s3.region %>',
        uploadConcurrency: 5,
        downloadConcurrency: 5
      },

      prod: {
        options: {
          bucket: '<%= secrets.s3.bucketname %>',
          differential: true,
          params: {
            CacheControl: '2000'
          }
        },
        files: [
          {expand: true, cwd: '<%= paths.dist_img %>', src: ['**'], dest: '<%= secrets.s3.bucketdir %>/<%= paths.dist_img %>'}
        ]
      }
    },

    // CDN will replace local paths with your CDN path
    cdn: {
      s3: {
        options: {
          cdn: '<%= secrets.s3.bucketuri %>/<%= secrets.s3.bucketname %>/<%= secrets.s3.bucketdir %>',
          flatten: true,
          supportedTypes: 'html'
        },
        cwd: './<%= paths.dist %>',
        dest: './<%= paths.dist %>',
        src: ['*.html']
      }
    },

    // Replace compiled template images sources from ../src/html to ../dist/html
    replace: {
      src_images: {
        options: {
          usePrefix: false,
          patterns: [
           {
             match: /(<img[^>]+[\"'])(\.\.\/src\/img\/)/gi,  // Matches <img * src="../src/img or <img * src='../src/img'
              replacement: '$1../<%= paths.dist_img %>/'
            },
            {
              match: /(url\(*[^)])(\.\.\/src\/img\/)/gi,  // Matches url('../src/img') or url(../src/img) and even url("../src/img")
              replacement: '$1../<%= paths.dist_img %>/'
            }
          ]
        },

        files: [{
          expand: true,
          flatten: true,
          src: ['<%= paths.dist %>/*.html'],
          dest: '<%= paths.dist %>'
        }]
      }
    },

    // Inlines your CSS
    juice: {
      your_target: {
        options: {
          preserveMediaQueries: true,
          applyAttributesTableElements: true,
          applyWidthAttributes: true,
          preserveImportant: true,
          preserveFontFaces: true,
          webResources: {
            images: false
          }
        },
        files: [{
          expand: true,
          src: ['<%= paths.dist %>/*.html'],
          dest: ''
        }]
      }
    },

    // Watches for changes to CSS or email templates then runs grunt tasks
    watch: {
      emails: {
        files: ['<%= paths.src %>/css/scss/*','<%= paths.src %>/emails/*','<%= paths.src %>/layouts/*','<%= paths.src %>/partials/**/*','<%= paths.src %>/data/*', '<%= paths.src_img %>/*'],
        tasks: ['build']
      },
      preview_dist: {
        files: ['./dist/*'],
        tasks: [],
        options: {
          livereload: true
        }
      }
    }
  });


  grunt.loadNpmTasks('grunt-assemble');
  grunt.loadNpmTasks('grunt-autoprefixer');
  grunt.loadNpmTasks('grunt-aws-s3');
  grunt.loadNpmTasks('grunt-cdn');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-imagemin');
  grunt.loadNpmTasks('grunt-contrib-sass');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-juice-email');
  grunt.loadNpmTasks('grunt-replace');

  grunt.registerTask('buildcss', ['sass', 'autoprefixer', 'juice']);
  grunt.registerTask('buildimg', ['imagemin']);
  grunt.registerTask('build', ['sass', 'assemble', 'juice', 'imagemin', 'replace:src_images']);
  grunt.registerTask('default', ['build', 'aws_s3', 'cdn:s3', 'watch']);
  grunt.registerTask('s3upload', ['build', 'aws_s3', 'cdn:s3'])
};
