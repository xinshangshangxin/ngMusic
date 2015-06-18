var musicApp = angular.module('MusicApp', ['ui.router', 'MainModule']);

musicApp.config(['$stateProvider', '$urlRouterProvider',function($stateProvider, $urlRouterProvider) {
    $urlRouterProvider.otherwise('/index');
    $stateProvider
        .state('index', {
            url: '/index',
            views: {
                '': {templateUrl: 'tpls/main.html'},
                'choose@index': {templateUrl: 'tpls/choose.html'},
                'list@index': {
                    templateUrl: 'tpls/list.html'
                },
                'music@index': {
                    templateUrl: 'tpls/musicctrl.html'
                }
            }
        })
        .state('login', {
            url: '/login',
            views: {
                '': {templateUrl: 'tpls/login.html'}
            }
        });
}]);
