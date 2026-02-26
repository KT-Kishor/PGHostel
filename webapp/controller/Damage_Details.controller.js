sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "../utils/validation",
    "../model/formatter",
], function (
    BaseController,
    JSONModel,
    utils,
    Formatter
) {
    "use strict";

    return BaseController.extend("sap.ui.com.project1.controller.Damage_Details", {
        Formatter: Formatter,
        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("RouteDamageDetails").attachMatched(this._onRouteMatched, this);
        },
        _onRouteMatched: async function (oEvent) {

            this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
            var sDamageID = decodeURIComponent(oEvent.getParameter("arguments").sPath);
            this.decodedPath = sDamageID;

            var model = new JSONModel({
                CustomerID: "",
                CustomerName: "",
                RoomNo: "",
                BedTypeName: "",
                BranchCode: "",
                ItemName: "",
                Description: "",
                Cost: "",
                Date: Formatter.formatDate(new Date()),
                Status: "Pending",
                DamageID: "",
                Currency: "",
                CustomerEmail: "",
                Type: "",
                UserID: "",
                Items: []
            });
            this.getView().setModel(model, "DamageModel");
            var loginModel = this.getOwnerComponent().getModel("LoginModel");
              var model = new JSONModel({
                visible: false,
            });
            this.getView().setModel(model, "VisibleModel")
            this.BranchCode = loginModel.getProperty("/BranchCode");
            sap.ui.core.BusyIndicator.show(0);

            await this.readCustomerData();

            this.OnSearch()

        },
        OnSearch: async function () {
            const filter = {
                DamageID: this.decodedPath
            };
            sap.ui.core.BusyIndicator.show(0);
           if(this.decodedPath!=="Damage"){
           await  this.ajaxReadWithJQuery("HM_DamageItem", filter).then((oData) => {
                var oFCIAerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                var Damage = oFCIAerData[0].HM_Damage[0];
                var Items = oFCIAerData[0].HM_DamageItem;
                var aItemsWithIndex = Items.map(function (item, index) {
                    return {
                        IndexNo: index + 1,
                        Type: item.Type,
                        ItemName: item.ItemName,
                        Description: item.Description,
                        Cost: item.Cost,
                        Quantity: item.Quantity
                    };
                });
                var DamageModel = {
             
                    CustomerID: Damage.CustomerID,
                    CustomerName: Damage.CustomerName,
                    RoomNo: Damage.RoomNo,
                    BedTypeName: Damage.BedTypeName,
                    BranchCode: Damage.BranchCode,
                    Date: Formatter.formatDate(new Date(Damage.InvoiceDate)),
                    Status: Damage.Status,
                    Currency: Damage.Currency,
                    CustomerEmail: Damage.CustomerEmail,
                    UserID: Damage.UserID,
                    TotalCost: Damage.TotalCost,
                    Items: aItemsWithIndex
                }
               
                var model = new JSONModel(DamageModel);
                this.getView().setModel(model, "DamageModel");
            })
        }
            if(this.decodedPath==="Damage"){
            this.getView().getModel("VisibleModel").setProperty("/visible", true);
            this.getView().byId("HD_id_CustomerID1").setEditable(true);

            }else{
            this.getView().getModel("VisibleModel").setProperty("/visible", false);
            this.getView().byId("HD_id_CustomerID1").setEditable(false);

            }
             sap.ui.core.BusyIndicator.hide();

        },
        DM_onPressEdit: function () {
            this.getView().getModel("VisibleModel").setProperty("/visible", true);
        },

        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("RouteDamage");
        },

        onHome: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteHostel");
        },
        DM_onPressAddDamageItems: function () {
            var oModel = this.getView().getModel("DamageModel");
            var aItems = oModel.getProperty("/Items");

            aItems.push({
                IndexNo: aItems.length + 1,
                Type: "",
                ItemName: "",
                Description: "",
                Cost: "",
                Total: ""
            });

            oModel.setProperty("/Items", aItems);
        },
        onTotalInputLiveChange: function (oEvent) {

            var oInput = oEvent.getSource();
            var sValue = oEvent.getParameter("value");

            var oContext = oInput.getBindingContext("DamageModel");
            var oModel = this.getView().getModel("DamageModel");

            oModel.setProperty(oContext.getPath() + "/Cost", sValue);

            var aItems = oModel.getProperty("/Items") || [];
            var totalCost = 0;

            aItems.forEach(function (item) {
                totalCost += parseFloat(item.Cost) || 0;
            });

            oModel.setProperty("/TotalCost", totalCost.toFixed(2));
        },
     DM_onPressSubmit: function () {

    var oModel = this.getView().getModel("DamageModel");
    var oData = oModel.getData();

    var Payload = {
        data: {
            CustomerID: oData.CustomerID,
            UserID: oData.UserID,
            CustomerName: oData.CustomerName,
            CustomerEmail: oData.CustomerEmail,
            InvoiceDate: oData.Date.split('/').reverse().join('-'),
            RoomNo: oData.RoomNo,
            Currency: oData.Currency,
            Status: "Pending",
            BedTypeName: oData.BedTypeName,
            TotalCost: oData.TotalCost,
            BranchCode: oData.BranchCode
        },
        Items: oData.Items.map(item => {
            return {
                Type: item.Type,
                ItemName: item.ItemName,
                Description: item.Description,
                Cost: item.Total,
                Quantity: item.Quantity
            };
        })
    };

    sap.ui.core.BusyIndicator.show(0);

    if (oData.DamageID) {

        // 🔵 UPDATE
        Payload.DamageID=oData.DamageID,
        this.ajaxUpdateWithJQuery("HM_DamageItem", Payload)
            .then(() => {
                sap.ui.core.BusyIndicator.hide();
                sap.m.MessageToast.show("Damage Updated Successfully");
                this.OnSearch();
                this.getView().getModel("VisibleModel")
                    .setProperty("/visible", false);
            })
            .catch(err => {
                sap.ui.core.BusyIndicator.hide();
                sap.m.MessageToast.show("Error while updating");
                console.error(err);
            });

    } else {

        // 🟢 CREATE
        this.ajaxCreateWithJQuery("HM_Damage", Payload)
            .then(() => {
                sap.ui.core.BusyIndicator.hide();
                sap.m.MessageToast.show("Damage Created Successfully");
                this.OnSearch();
                this.getView().getModel("VisibleModel")
                    .setProperty("/visible", false);
            })
            .catch(err => {
                sap.ui.core.BusyIndicator.hide();
                sap.m.MessageToast.show("Error while saving");
                console.error(err);
            });
    }
},
        readCustomerData: function () {

            var filter = {
                BranchCode: this.BranchCode
            };

            this.ajaxReadWithJQuery("HM_BookingCustomerReadCall", filter).then((oData) => {
                var aData = Array.isArray(oData.commentData) ?
                    oData.commentData : [oData.commentData];

                const aFilteredData = aData.filter(item =>
                    item.Status === "Assigned" || item.Status === "Completed"
                );

                this.getView().setModel(
                    new sap.ui.model.json.JSONModel(aFilteredData),
                    "CustomerModel"
                );

            })

        },

        onChangeAddCustomer: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent);
            this.SelectKey = oEvent.getSource().getSelectedKey();
            const allData = this.getView().getModel("CustomerModel").getData();

            const SelectedData = allData.find(item => item.CustomerID === this.SelectKey);
            if (!SelectedData) return;

            var oDamageModel = this.getView().getModel("DamageModel");
            oDamageModel.setProperty("/CustomerID", SelectedData.CustomerID);
            oDamageModel.setProperty("/CustomerName", SelectedData.CustomerName);
            oDamageModel.setProperty("/RoomNo", SelectedData.RoomNo);
            oDamageModel.setProperty("/BedTypeName", SelectedData.BedType);
            oDamageModel.setProperty("/BranchCode", SelectedData.BranchCode);
            oDamageModel.setProperty("/CustomerEmail", SelectedData.CustomerEmail);
            oDamageModel.setProperty("/Currency", SelectedData.Currency);
            oDamageModel.setProperty("/UserID", SelectedData.UserID)
        },
    });
});