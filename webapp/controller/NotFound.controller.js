sap.ui.define([
    "sap/ui/core/mvc/Controller",
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller) {
        "use strict";

        return Controller.extend("sap.ui.com.project1.controller.NotFound", {
            
            onInit: function () {
                
            },

            onNavBack: function () {
                this.getOwnerComponent().getRouter().navTo("RouteHostel", {}, true);
            }  
        });
               
    });