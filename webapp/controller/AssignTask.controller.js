sap.ui.define([
    "./BaseController", "sap/ui/model/json/JSONModel", "sap/m/MessageToast",
],
    function (BaseController, JSONModel, MessageToast) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.AssignTask", {
            onInit: function () {
                this.getRouter().getRoute("RouteAssignTask").attachMatched(this._onRouteMatched, this);
            },
            AT_onPressback: function () {
                this.getRouter().navTo("RouteManageAssignment");
            },
            AT_onAssignEmpTask: function () {
                if (!this.AT_oDialog) {
                    sap.ui.core.Fragment.load({
                        name: "sap.kt.com.minihrsolution.fragment.NewAssignment",
                        controller: this,
                    }).then(function (AT_oDialog) {
                        this.AT_oDialog = AT_oDialog;
                        this.getView().addDependent(this.AT_oDialog);
                        this.AT_oDialog.open();
                    }.bind(this));
                } else {
                    this.AT_oDialog.open();
                }
            },
            TaskF_onTaskClose: function () {
                this.AT_oDialog.close();
            },




        });
    });