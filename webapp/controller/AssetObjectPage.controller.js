sap.ui.define([
    "./BaseController",
    "../model/formatter",
    "sap/ui/model/json/JSONModel",


], function (
    BaseController,
    Formatter,
    JSONModel
) {
    "use strict";

    return BaseController.extend("sap.kt.com.minihrsolution.controller.AssetObjectPage", {
        Formatter: Formatter,
        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("AssetObjectPage").attachMatched(this._onRouteMatched, this);
        },
        _onRouteMatched: async function (oEvent) {
            this.Name =  oEvent.getParameter("arguments").Name;
            this.Slno = oEvent.getParameter("arguments").sPath;
            await this._fetchCommonData("IncomeAsset", "objectModel", {
                SerialNumber: this.Slno,
            })
            var data = this.getOwnerComponent().getModel("objectModel").getData();
            var timelineData = [];

            data.forEach(function (item) {
                if (item.AssetCreationDate && item.Status != "Transferred") {
                    timelineData.push({
                        type: "Asset Creation",
                        dateTime: item.AssetCreationDate,
                        title: item.PickedEmployeeID,
                        userName: item.PickedEmployeeName,
                        Status: "Available"
                    });
                }

                if (item.AssignedDate) {
                    timelineData.push({
                        type: "Assignment",
                        dateTime: item.AssignedDate,
                        title: item.AssignEmployeeID,
                        userName: item.AssignEmployeeName,
                        Status: "Assigned"

                    });
                }

                if (item.TrashDate) {
                    timelineData.push({
                        type: "Trash",
                        dateTime: item.TrashDate,
                        Status: "Trashed"
                    });
                }
                if (item.ReturnDate && item.ReturnDate !== "1899-11-30T00:00:00.000Z") {
                    timelineData.push({
                        type: "Return",
                        dateTime: item.ReturnDate,
                        title: item.AssignEmployeeID,
                        userName: item.AssignEmployeeName,
                        Status: "Returned",
                         ReturnEmpName:"Return To " + item.ReturnEmpName + " " + item.ReturnEmpID,
                        
                    });
                }
                if (item.TransferDate && item.TransferDate !== "1899-11-30T00:00:00.000Z") {
                    timelineData.push({
                        type: "Transfer",
                        dateTime: item.TransferDate,
                        userName: item.TransferByName,
                        title: item.TransferByID,
                        Status: "Transferred"
                    });
                }
            });
            var oModel = new sap.ui.model.json.JSONModel(timelineData);
            this.getView().setModel(oModel, "Mymodel");
        },
        getTimelineDate: function (assetDate, assignedDate, status) {
            if (status === "Available") {
                return this.formatDate(assetDate);
            } else {
                return this.formatDate(assignedDate);
            }
        },
        AOP_onButtonPress: function () {
            if(this.Name === "Asset"){
                this.getRouter().navTo("RouteAssetAssignment");
            }else{
                this.getRouter().navTo("RouteIncomeAsset");
            }
        }
    });
});