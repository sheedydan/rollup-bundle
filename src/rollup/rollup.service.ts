/// <reference path="../../../../../Scripts/typings/index.ts" />
'use strict';
class ContentTypeReference {
    title: string;
    name: string;
    contentType: SP.ContentType;
    fieldNames: Array<string>;
}
class SortField {
    fieldName: string;
    direction: string;
}
class FilterField {
    fieldName: string;
    term: string;
}
class CacheItem {
    key: string;
    data: Array<any>;
    nextPageInfo: string;
    previousPageInfo: string;
    pageNumber: number;
}
class Config {
    pageNumber: number = 1;
    pageSize: number = 15;
    position: SP.ListItemCollectionPosition;
    nextPagingInfo: any;
    previousPagingInfo: any;
    contentTypes: Array<ContentTypeReference>;
    listName: string;
    webUrl: string;
    selectedContentTypeName: string = "";
    sortField: SortField = null;
    filterFields: Array<FilterField> = null; 
    cachingEnabled: boolean = true;
};
class RollupService {
    constructor() {
        this.config = new Config();
        this.config.contentTypes = [];

    }
    cache = new Array<CacheItem>();
    config: Config;
    cacheGet = (key:string) => {
        for (var i = this.cache.length - 1; i >= 0; i--) {
            if (this.cache[i].key === key) {
                return this.cache[i];
            }
        }
        return null;
    };
    hasNextPage() {
        if (this.config.nextPagingInfo != null) {
            return true;
        }
        return false;
    } 
    hasPreviousPage() {
        if (this.config.previousPagingInfo) {
            return true;
        }
        return false;
    } 
    executeQuery = (clientContext: SP.ClientContext) => {
        var deferred = $.Deferred();
        clientContext.executeQueryAsync(
            (sender, args) => {
                deferred.resolve(sender, args);
            },
            (sender, args) => {
                deferred.reject(sender, args);
            }
        );
        return deferred.promise();
    };

    loadContentTypes = () => {
        var deferred = $.Deferred();
        var clientContext = SP.ClientContext.get_current();
        var contentTypes = clientContext.get_web().get_availableContentTypes();
        clientContext.load(contentTypes); //TODO: for performance we could store the CT id, but makes it more difficult for config.
        var local = this;
        var getCt = (name: string) => {
            for (var i = 0; i < local.config.contentTypes.length; i++) {
                if (local.config.contentTypes[i].name === name) {
                    return local.config.contentTypes[i];
                }
            }
            return null;
        };
       
        this.executeQuery(clientContext).done(
            (sender: any, args: any) => {
                for (var i = 0; i < contentTypes.get_count(); i++) {
                    var ct = contentTypes.getItemAtIndex(i);
                    var localCt = getCt(ct.get_name());
                    if (localCt) {
                        localCt.contentType = ct;
                        clientContext.load(ct);
                        clientContext.load(ct.get_fields());
                        //Load the fields we are using only
                        for (var fieldIndex = 0; fieldIndex < localCt.fieldNames.length; fieldIndex++) {
                            clientContext.load(ct.get_fields()
                                .getByInternalNameOrTitle(localCt.fieldNames[fieldIndex]));
                        }
                    }
                }
                this.executeQuery(clientContext).done(() => {
                    deferred.resolve(this.config.contentTypes);
                }).fail((sender, args) => {
                    deferred.reject(sender, args);
                });
            }
        );
        return deferred.promise();
    };
    hashString = (s) => {
        return s.split("").reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0);
    }
    getSelectedContentType() {
        for (var i = 0; i < this.config.contentTypes.length; i++) {
            if (this.config.contentTypes[i].name === this.config.selectedContentTypeName) {
                return this.config.contentTypes[i];
            }
        }
        return null;
    }
    loadAll() {
        var selectedCt = this.getSelectedContentType();
        return this.loadData(this.config.listName, this.config.webUrl, selectedCt);
    }
    loadData(listName: string, webUrl: string, contentTypeReference: ContentTypeReference) {
        var deferred = $.Deferred();

        var camlBuilder = new SpData.CamlBuilder();
        camlBuilder.begin(true); //Makes the caml builder use an AND query
        camlBuilder.addTextClause(SpData.CamlOperator.BeginsWith, "ContentTypeId", contentTypeReference.contentType.get_stringId());
        camlBuilder.addViewFields(contentTypeReference.fieldNames);
        if (this.config.sortField && this.config.sortField.fieldName && this.config.sortField.direction) {
            camlBuilder.addOrderBy(this.config.sortField.fieldName, this.config.sortField.direction.toLowerCase() === "asc");    
        }
        if (this.config.filterFields && this.config.filterFields.length) {
            for (var i = 0; i < this.config.filterFields.length; i++) {
                var filter = this.config.filterFields[i];
                //TODO: might need to review this for different sp data types.
                if (contentTypeReference.fieldNames.indexOf(filter.fieldName) > -1 && filter.term) {
                    camlBuilder.addTextClause(SpData.CamlOperator.Contains, this.config.filterFields[i].fieldName, this.config.filterFields[i].term);    
                }
            }
        }
        if (angular.isNumber(this.config.pageSize)) {
            camlBuilder.rowLimit = this.config.pageSize;    
        }
        var viewXml = camlBuilder.viewXml;
        //Check the cache first
        if (this.config.cachingEnabled) {
            var cacheKey = this.hashString(viewXml + "-" + this.config.pageNumber);
            var cachedItem = this.cacheGet(cacheKey);
            if (cachedItem) {
                this.config.nextPagingInfo = cachedItem.nextPageInfo;
                this.config.previousPagingInfo = cachedItem.previousPageInfo;
                this.config.pageNumber = cachedItem.pageNumber;
                deferred.resolve(cachedItem.data);
                return deferred.promise();
            }
        }
        var clientContext = SP.ClientContext.get_current();
        var web = clientContext.get_site().openWeb(webUrl);
        var list = web.get_lists().getByTitle(listName);
        var query = new SP.CamlQuery();
        query.set_viewXml(viewXml);
        if (this.config.position) {
            query.set_listItemCollectionPosition(this.config.position);
        }
        var listItems = list.getItems(query);
        clientContext.load(listItems);
        this.executeQuery(clientContext)
            .done((sender: any, args: any) => {
                var pageItems = new Array();
                var iterator = listItems.getEnumerator();
                while (iterator.moveNext()) {
                    var listItem = iterator.get_current();
                    var item = {} as any;
                    for (var i = 0; i < contentTypeReference.fieldNames.length; i++) {
                        item[contentTypeReference.fieldNames[i]] = listItem
                            .get_item(contentTypeReference.fieldNames[i]);
                        item.WebUrl = webUrl;
                        item.ListName = listName;
                    }
                    pageItems.push(item);
                }
                if (listItems.get_listItemCollectionPosition()) {
                    this.config.nextPagingInfo = listItems.get_listItemCollectionPosition().get_pagingInfo();
                } else {
                    this.config.nextPagingInfo = null;
                }
                if (pageItems.length > 0) {
                    this.config.previousPagingInfo = "PagedPrev=TRUE&Paged=TRUE&p_ID=" + listItems.itemAt(0).get_item('ID');
                }
                else {
                    this.config.previousPagingInfo = null;
                }
                if (this.config.cachingEnabled) {
                    var cacheItem = new CacheItem();
                    cacheItem.key = cacheKey;
                    cacheItem.data = pageItems;
                    cacheItem.nextPageInfo = this.config.nextPagingInfo;
                    cacheItem.previousPageInfo = this.config.previousPagingInfo;
                    cacheItem.pageNumber = this.config.pageNumber;
                    this.cache.push(cacheItem);
                }
                deferred.resolve(pageItems);
            })
            .fail((sender: any, args: any) => {
                console.log("Error: " + args.get_message());
                deferred.fail(sender, args);
            });
        return deferred.promise();
    }
    
    public previousPage() {
        this.config.pageNumber = Math.max(1, this.config.pageNumber - 1);
        this.config.position = null;
        if (this.config.previousPagingInfo && this.config.pageNumber > 1) {
            this.config.position = new SP.ListItemCollectionPosition();
            this.config.position.set_pagingInfo(this.config.previousPagingInfo);
        }
        return this.loadAll();
    }
    public nextPage() {
        this.config.position = new SP.ListItemCollectionPosition();
        if (this.config.nextPagingInfo) {
            this.config.position.set_pagingInfo(this.config.nextPagingInfo);
            this.config.pageNumber++;
        }
        return this.loadAll();
    }
    public clear () {
        this.config.pageNumber = 1;
        this.config.nextPagingInfo = this.config.previousPagingInfo = this.config.position = null;
    }
    public clearCache() {
        this.cache = new Array<CacheItem>();
    }
}

(() => {

    angular.module("rollup.service", [])
        .factory("rollup.service", [() => {
            return new RollupService();
        }]);
})();

