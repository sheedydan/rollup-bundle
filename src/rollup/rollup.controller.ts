/// <reference path="../../../../../scripts/typings/index.ts" />
( () => {
    "use strict";
    class ListReference {
        listName: string;
        webUrl: string;
    }
    class AppConfig {
        contentTypes: Array<ContentTypeReference>;
        lists: Array<ListReference>;
    };

    var app = angular.module("rollup.module");
    app.controller("rollup.module.controller", [
        "$scope", "shared.tracker", "$q", "rollup.service","uiGridConstants",
        ($scope, tracker, $q, rollupSerice: RollupService, uiGridConstants) => {
            $scope.tracker = tracker;
            $scope.service = rollupSerice;
            $scope.config = null as Config;
            $scope.services = [] as Array<RollupService>;
            $scope.loadingImage = _spPageContextInfo.webServerRelativeUrl +
                '/style library/client apps/rollup/img/ajax-loader.gif';
            //settings - this loads from a separate script editor in the page.
            $scope.loadConfig = () => {
                $scope.config = new Config();
                var imported = (<any>window).rollupWebPartConfig as any;
                if (!imported) {
                    imported = {};
                    console
                        .log("No configuration could be found for the rollup web part.  Ensure you add the script editor web part with config settings.");
                    $scope
                        .lblMessage =
                        "No configuration could be found for the rollup web part.  Ensure you add the script editor web part with config settings.";
                }
                if (!imported.contentTypes) {
                    console.log("Warning - Rollup WP : The contentTypes array does not exist");
                }
                if (!imported.lists) {
                    console.log("Warning - Rollup WP : The lists array does not exist");
                }
                $scope.config.contentTypes = imported.contentTypes || [];
                $scope.config.cachingEnabled = imported.cachingEnabled || true;
                $scope.config.lists = imported.lists || [];
                if ($scope.config.contentTypes && $scope.config.contentTypes.length) {
                    $scope.settings.sortField = new SortField();
                    $scope.settings.sortField.fieldName = $scope.config.contentTypes[0].fieldNames[0];
                    $scope.settings.sortField.direction = "asc";
                }
                /*
                //Debug Config - normally imported through a script editor
                $scope.config.contentTypes = [
                    { title: "Defect", name: "Defect", contentType: null, fieldNames: ["FileLeafRef", "Title", "Some_x0020_Date", "A_x0020_Number", "Defect_x0020_Type"], sortField: "FileLeafRef", sortDirection: "asc"  },
                    { title: "Drawing", name: "Drawing", contentType: null, fieldNames: ["FileLeafRef", "Title"], sortField: "FileLeafRef", sortDirection: "asc"  }
                ];
                $scope.config.lists = [];
                $scope.config.lists.push({ listName: "Docs1", webUrl: _spPageContextInfo.webServerRelativeUrl });
                $scope.config.lists.push({ listName: "Docs2", webUrl: _spPageContextInfo.webServerRelativeUrl });
                $scope.config.lists.push({ listName: "Docs3", webUrl: _spPageContextInfo.webServerRelativeUrl + "/SubSite1" });
                if ($scope.config.contentTypes && $scope.config.contentTypes.length) {
                    $scope.settings.sortField = new SortField();
                    $scope.settings.sortField.fieldName = $scope.config.contentTypes[0].fieldNames[0];
                    $scope.settings.sortField.direction = "asc";
                }
                */
            };
            var getCurrentContentType = () => {
                for (var i = 0; i < $scope.config.contentTypes.length; i++) {
                    if ($scope.config.contentTypes[i].name === $scope.settings.selectedContentTypeName) {
                        return $scope.config.contentTypes[i];
                    }
                }
                return null;
            };
            var getFieldFromContentType = (name: string, contentTypeRef: ContentTypeReference) => {
                return contentTypeRef.contentType.get_fields().getByInternalNameOrTitle(name);
            };

            $scope.settings = {
                contentTypes: [] as Array<ContentTypeReference>,
                selectedContentTypeName: "",
                paginationPageSizes: [5, 15, 25, 50, 75, 100, "All"],
                pageNumber: 1,
                pageSize: 15,
                totalItems: 0,
                sortField: null as SortField,
                filterFields: null as Array<FilterField>,
                hasNextPage: () => {
                    for (var i = 0; i < $scope.services.length; i++) {
                        if ($scope.services[i].hasNextPage()) {
                            return true;
                        }
                    }
                    return false;
                },
                hasPreviousPage: () => {
                    return $scope.settings.pageNumber > 1;
                },
                nextPage: () => {
                    $scope.gridOptions.data = [];
                    $scope.settings.pageNumber++;
                    for (var i = 0; i < $scope.services.length; i++) {
                        if ($scope.services[i].hasNextPage()) {
                            $scope.render($scope.services[i].nextPage());
                        }
                    }
                },
                previousPage: function () {
                    $scope.gridOptions.data = [];
                    for (var i = 0; i < $scope.services.length; i++) {
                        if ($scope.services[i].hasPreviousPage() && $scope.services[i].config.pageNumber === $scope.settings.pageNumber) {
                            //only load pages for services that have pages available.  This leaves behind smaller lists.
                            $scope.render($scope.services[i].previousPage());
                        }
                        else if ($scope.services[i].hasPreviousPage() && $scope.services[i].config.pageNumber + 1 === $scope.settings.pageNumber) {
                            //catchup up to a page, so the smaller lists get reloaded here.
                            $scope.render($scope.services[i].loadAll());
                        }
                    }
                    this.pageNumber--;
                },
                pageSizeChange: () => {
                    $scope.reset();
                },
                selectContentType: (name: string) => {
                    $scope.settings.selectedContentTypeName = name;
                    $scope.reset();
                }
            };
            $scope.loaderMore = true;
            $scope.lblMessage = null;
            $scope.result = "color-green";

            $scope.highlightFilteredHeader = (row, rowRenderIndex, col, colRenderIndex) => {
                if (col.filters[0].term) {
                    return 'header-filtered';
                } else {
                    return '';
                }
            };
            $scope.grid = null;
            var timeoutHandle; //for delayed filtering
            $scope.gridOptions = {
                useExternalsettings: true,
                useExternalSorting: true,
                useExternalFiltering: true,
                enableFiltering: true,
                enableSorting: true,
                enableRowSelection: true,
                enableSelectAll: true,
                enableGridMenu: true,
                flatEntityAccess: true,
                showGridFooter: true,
                fastWatch: true,
                exporterMenuPdf: false, 
                exporterMenuCsv: false,
                
                columnDefs: [
                    { name: "WebUrl", displayName: "Location", width: '100', enableFiltering: false, enableSorting: false },
                ],
                exporterAllDataFn: function () {
                    throw "tw not implementd";
                    //return getPage(1, $scope.gridOptions.totalItems, settingsOptions.sort)
                    //    .then(function () {
                    //        $scope.gridOptions.useExternalsettings = false;
                    //        $scope.gridOptions.useExternalSorting = false;
                    //        getPage = null;
                    //    });
                },
                onRegisterApi: function (gridApi) {
                    $scope.gridApi = gridApi;
                    $scope.grid = gridApi.grid;
                   
                    $scope.gridApi.core.on.sortChanged($scope, () => {
                        console.log("sorting");
                        $scope.reset();
                    });
                    $scope.gridApi.core.on.filterChanged($scope, function () {
                        //Lazy filter
                        if (timeoutHandle) {
                            clearTimeout(timeoutHandle);
                        }
                        timeoutHandle = setTimeout(() => {
                            $scope.reset();
                            clearTimeout(timeoutHandle);    
                        },1000);
                    });
                }
            };

            ///Not used yet
            $scope.toggleFiltering = () => {
                $scope.gridOptions.enableFiltering = !$scope.gridOptions.enableFiltering;
                $scope.gridApi.core.notifyDataChange(uiGridConstants.dataChange.COLUMN);
            };
            $scope.sort = () => {
                var compare = (a, b) => {
                    if (a[$scope.settings.sortField.fieldName] > b[$scope.settings.sortField.fieldName]) {
                        return $scope.settings.sortField.direction === "asc" ? 1 : -1;
                    } else if (a[$scope.settings.sortField.fieldName] < b[$scope.settings.sortField.fieldName]) {
                        return $scope.settings.sortField.direction !== "asc" ? 1 : -1;
                    }
                    return 0;
                };
                $scope.gridOptions.data.sort(compare);
            };
            $scope.render = (result: JQueryPromise<any>) => {
                tracker.track("global");
                result.then(
                    (response) => {
                        var startFrom = ($scope.settings.pageNumber - 1) * $scope.settings.pageSize;
                        $scope.settings.totalItems = startFrom + response.length;
                        if (response.length === $scope.settings.pageSize) {
                            $scope.settings.totalItems++; //show an extra item for the paging.
                        }
                        $scope.gridOptions.data = $scope.gridOptions.data.concat(response);
                        $scope.loaderMore = false;
                        $scope.gridApi.core.refresh();    
                    },
                    (error) => {
                        console.log("Error: " + error);
                    }).done(() => {
                        $scope.sort();
                        tracker.untrack("global");
                });
            };

            //Selected Call
            $scope.GetByID = model => {
                $scope.SelectedRow = model;
            };
            var createGridColumn = (field: SP.Field) => {
                var create = (name:string, title:string, type:string, filter:boolean, cellFilter:string = null) => {
                    var column = {
                        displayName: title,
                        enableColumnMoving: true,
                        enableColumnResizing: true,
                        enableFiltering: filter,
                        enablePinning: true,
                        enableSorting: true,
                        cellFilter: cellFilter,
                        name: name,
                        type: type
                    };
                    return column;
                };

                switch (field.get_fieldTypeKind()) {
                    case SP.FieldType.number:
                        $scope.gridOptions.columnDefs.push(create(field.get_internalName(), field.get_title(), "number", true));
                        break;
                    case SP.FieldType.dateTime:
                        $scope.gridOptions.columnDefs.push(create(field.get_internalName(), field.get_title(), "date", true, 'date:"dd MMM yyyy hh:mm"'));
                        break;
                    default:
                    case SP.FieldType.text:
                    case SP.FieldType.file:
                        $scope.gridOptions.columnDefs.push(create(field.get_internalName(), field.get_title(), "string", true));
                        break;
                }
                
            };
            var setColumns = () => {
                $scope.gridOptions.columnDefs.splice(1);//Just keep the first column as is fixed weburl
                var ct = getCurrentContentType();
                for (var i = 0; i < ct.fieldNames.length; i++) {
                    var field = getFieldFromContentType(ct.fieldNames[i], ct);
                    if (field) {
                        createGridColumn(field);
                    }
                    else {
                        console.log("Warning: field not found " + ct.fieldNames[i].name);
                    }
                }
            };
            $scope.refresh = () => {
                $scope.reset(true);
            };
            var initialiseService = (service:RollupService) => {
                service.clear();
                service.config.contentTypes = $scope.config.contentTypes;
                service.config.pageSize = $scope.settings.pageSize;
                service.config.pageNumber = $scope.settings.pageNumber;
                service.config.contentTypes = $scope.config.contentTypes;
                service.config.selectedContentTypeName = $scope.settings.selectedContentTypeName;
                service.config.sortField = $scope.settings.sortField;
                service.config.filterFields = $scope.settings.filterFields;
            }
            $scope.applySortAndFilter = () => {
                $scope.settings.filterFields = [] as Array<FilterField>;
                for (var i = 0; i < $scope.grid.columns.length; i++) {
                    var column = $scope.grid.columns[i];
                    if (column.sort.direction) {
                        $scope.settings.sortField = new SortField();
                        $scope.settings.sortField.fieldName = column.field;
                        $scope.settings.sortField.direction = column.sort.direction;
                    }
                    if (column.filters && column.filters.length) {
                        var filterField = new FilterField();
                        filterField.fieldName = column.field;
                        filterField.term = column.filters[0].term;
                        $scope.settings.filterFields.push(filterField);
                    }
                }
            };
            $scope.reset = (clearCache: boolean = false) => {
                setColumns();
                $scope.settings.pageNumber = 1;
                $scope.gridOptions.data = [];
                $scope.applySortAndFilter();
                for (var i = 0; i < $scope.services.length; i++) {
                    if (clearCache) {
                        $scope.services[i].clearCache();
                    }
                    initialiseService($scope.services[i]);

                    $scope.render($scope.services[i].loadAll());
                }
            };
            var setInitialSortField = () => {
                //Set the initial sort field
                if ($scope.config.contentTypes[0].sortField) {
                    $scope.settings.sortField.fieldName = $scope.config.contentTypes[0].sortField;
                    $scope.settings.sortField.direction = $scope.config.contentTypes[0].sortDirection;
                }
                //Update the grid
                for (var i = 0; i < $scope.grid.columns.length; i++) {
                    var column = $scope.grid.columns[i];
                    if (column.field === $scope.settings.sortField.fieldName) {
                        column.sort.direction = $scope.settings.sortField.sortDirection;
                        break;
                    }
                }
            };
            var createServices = () => {
                for (var i = 0; i < $scope.config.lists.length; i++) {
                    var service = new RollupService();
                    service.config.listName = $scope.config.lists[i].listName;
                    service.config.webUrl = $scope.config.lists[i].webUrl;
                    service.config.contentTypes = $scope.config.contentTypes;
                    $scope.services.push(service);
                }
            };
            $scope.init = () => {
                SP.SOD.executeFunc('sp.js', 'SP.ClientContext', () => {
                    //Default Load
                    $scope.settings.pageNumber = 1;
                    $scope.settings.pageSize = 5;
                    $scope.loadConfig();
                    createServices();
                    if ($scope.services.length) {
                        tracker.track('global');
                        $scope.services[0].loadContentTypes().done((contentTypes: Array<ContentTypeReference>) => {
                            $scope.config.contentTypes = $scope.services[0].config.contentTypes;
                            $scope.settings.selectedContentTypeName = contentTypes[0].name;
                            setInitialSortField();
                            tracker.untrack('global');
                            $scope.reset();
                        }).fail((sender, args) => {
                            alert("Error: " + args.get_message());
                        });
                    } else {
                        console.log("Web part not configured");
                    }
                    
                });
            };
        }
    ]);
})();