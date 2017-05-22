// Importing Angular so we can reference it and webpack knows about it
import angular from 'angular';

// Importing component
import ForecastController from './src/forecast/forecast.controller';
import ForecastService from './src/forecast/forecast.service';

// Initialising angular module
angular.module('weatherApp', [])
    .service('forecastService', ForecastService)
    .component('forecast', {
        //we require the template in so that webpack can traverse
        template: require('./src/forecast/forecast.html'),
        //our imported controller module
        controller: ForecastController
    });

// manual bootstrap
angular.element(function() {
    angular.bootstrap(document.getElementById("weatherAppContainer"), ['weatherApp']);
});