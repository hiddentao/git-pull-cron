module.exports = (grunt) ->
  require('matchdep').filterDev('grunt-*').forEach (contrib) ->
    grunt.loadNpmTasks contrib

  config =
    test: 'test'

  grunt.initConfig
    config: config

    jshint:
      options:
        jshintrc: './.jshintrc'
      default:
        files:
          src: [
            './index.js'
          ]

    mochaTest:
      test:
        options:
          timeout: 5000
          ui: 'exports'
          reporter: 'spec'
        src: [
          '<%= config.test %>/test.js'
        ]

  
  grunt.registerTask "default", [
    "jshint"
    "mochaTest"
  ]
  
