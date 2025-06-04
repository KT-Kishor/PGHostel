sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "../utils/validation",
    "../model/formatter"
], function (
    BaseController,
    JSONModel,
    utils,
    formatter) {
    "use strict";

    return BaseController.extend("sap.kt.com.minihrsolution.controller.PurchaseOrder", {
       formatter: formatter,
        onInit: function () {
            this.getRouter().getRoute("PurchaseOrder").attachPatternMatched(this._onRouteMatched, this);
        },
        _onRouteMatched: async function () {

                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
            var LoginFUnction = await this.commonLoginFunction("MSA&SOW");
            if (!LoginFUnction) return;
            await this.PO_ReadCall()

            await this._fetchCommonData("ManageCustomer", "ManageCustomerModel");
            this._fetchCommonData("Currency", "CurrencyModel");

            var model = new JSONModel({
                "CustomerName": "",
                "Type": "",
                "Address": "",
                "StartDate": "",
                "EndDate": "",
                "PAN": "",
                "CurrentDate": "",
                "Description": "",
                "Unit": "",
                "Amount": "",
                "Currency": "",
                "PurchaseOrders": [],

            })
            this.getView().setModel(model, "PurchaseOrderModel");

        },
        onPressback: function () {
            this.getRouter().navTo("RouteTilePage");
        },
        onLogout: function () {
            this.CommonLogoutFunction()
        },
        PO_onCreatePurchaseOrder: function () {
            var Table = this.getView().byId("PO_id_Table");

            if (!this.PO_oDialog) {
                sap.ui.core.Fragment.load({
                    name: "sap.kt.com.minihrsolution.fragment.PurchaseOrder",
                    controller: this,
                }).then(function (PO_oDialog) {
                    this.PO_oDialog = PO_oDialog;
                    this.getView().addDependent(this.PO_oDialog);
                    this._FragmentDatePickersReadOnly(["PO_id_StartDate", "PO_id_EndDate", "PO_id_Date"]);
                    sap.ui.getCore().byId("PO_id_Address").setEditable(true);
                    sap.ui.getCore().byId("PO_id_PanNo").setEditable(true)
                    sap.ui.getCore().byId("PO_id_Date").setMinDate(new Date());
                    sap.ui.getCore().byId("PO_id_Date").setMaxDate(new Date());


                    this.PO_oDialog.open();
                    Table.removeSelections();

                }.bind(this));
            } else {
                this.PO_oDialog.open();
                sap.ui.getCore().byId("PO_id_CustomerName").setValue("").setValueState("None");
                sap.ui.getCore().byId("PO_id_Address").setValue("").setValueState("None");
                sap.ui.getCore().byId("PO_id_PanNo").setValue("").setValueState("None");
                sap.ui.getCore().byId("PO_id_StartDate").setValue("").setValueState("None");
                sap.ui.getCore().byId("PO_id_EndDate").setValue("").setValueState("None");
                sap.ui.getCore().byId("PO_id_Date").setValue("").setValueState("None");
                sap.ui.getCore().byId("PO_id_Address").setEditable(true);
                sap.ui.getCore().byId("PO_id_PanNo").setEditable(true)
                sap.ui.getCore().byId("PO_id_Date").setMinDate(new Date());
                sap.ui.getCore().byId("PO_id_Date").setMaxDate(new Date());

                this._FragmentDatePickersReadOnly(["PO_id_StartDate", "PO_id_EndDate", "PO_id_Date"]);
              
                    Table.removeSelections();


            }
        },
        PO_onEditPurchaseOrder:async function (e) {
          
            var Table = this.getView().byId("PO_id_Table");
            var selectedItem = Table.getSelectedItem();
          var data= await this.ajaxReadWithJQuery("PurchaseOrderItems",{PoNumber:selectedItem.getBindingContext("POModel").getObject().PoNumber}).then((oData) => {
                var oFCIAerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                // this.getOwnerComponent().setModel(new JSONModel(oFCIAerData), "PO");
                return oFCIAerData;
            }); 
            

             var oModel = this.getView().getModel("PurchaseOrderModel")
            if (!this.PO_oDialog) {
                sap.ui.core.Fragment.load({
                    name: "sap.kt.com.minihrsolution.fragment.PurchaseOrder",
                    controller: this,
                }).then(function (PO_oDialog) {
                    this.PO_oDialog = PO_oDialog;
                    this.getView().addDependent(this.PO_oDialog);
                    this._FragmentDatePickersReadOnly(["PO_id_StartDate", "PO_id_EndDate", "PO_id_Date"]);

                    oModel.setProperty("/CustomerName", data[0].PurchaseOrder[0].CustomerName);
                    oModel.setProperty("/Address", data[0].PurchaseOrder[0].Address);
                    oModel.setProperty("/PAN", data[0].PurchaseOrder[0].PAN);
                    oModel.setProperty("/Description", data.Description);
                    oModel.setProperty("/Type",data[0].PurchaseOrder[0].Type || "internal");
                    oModel.setProperty("/PurchaseOrders", data[0].PurchaseOrderItems);
                    // sap.ui.getCore().byId("PO_id_Description").setValue(data[0].PurchaseOrderItems[0].Description);
                    sap.ui.getCore().byId("PO_id_StartDate").setDateValue(new Date(data[0].PurchaseOrder[0].StartDate));
                    sap.ui.getCore().byId("PO_id_EndDate").setDateValue(new Date(data[0].PurchaseOrder[0].EndDate));
                    sap.ui.getCore().byId("PO_id_Date").setDateValue(new Date(data[0].PurchaseOrder[0].CurrentDate));
                    sap.ui.getCore().byId("PO_id_Address").setEditable(false);
                    sap.ui.getCore().byId("PO_id_PanNo").setEditable(false);


                    this.PO_oDialog.open();
                }.bind(this));
            } else {
                 this.PO_oDialog.open();
                    oModel.setProperty("/CustomerName", data[0].PurchaseOrder[0].CustomerName);
                    oModel.setProperty("/Address", data[0].PurchaseOrder[0].Address);
                    oModel.setProperty("/PAN", data[0].PurchaseOrder[0].PAN);
                    oModel.setProperty("/Description", data.Description);
                    oModel.setProperty("/Type",data[0].PurchaseOrder[0].Type || "internal");
                    oModel.setProperty("/PurchaseOrders", data[0].PurchaseOrderItems);
                    // sap.ui.getCore().byId("PO_id_Description").setValue(data[0].PurchaseOrderItems[0].Description);

                    sap.ui.getCore().byId("PO_id_StartDate").setDateValue(new Date(data[0].PurchaseOrder[0].StartDate));
                    sap.ui.getCore().byId("PO_id_EndDate").setDateValue(new Date(data[0].PurchaseOrder[0].EndDate));
                    sap.ui.getCore().byId("PO_id_Date").setDateValue(new Date(data[0].PurchaseOrder[0].CurrentDate));
                    sap.ui.getCore().byId("PO_id_Address").setEditable(false);
                    sap.ui.getCore().byId("PO_id_PanNo").setEditable(false);

                this._FragmentDatePickersReadOnly(["PO_id_StartDate", "PO_id_EndDate", "PO_id_Date"]);


            }
        },
        onAddItemButtonPress: function () {
            var oModel = this.getView().getModel("PurchaseOrderModel");
            var aData = oModel.getProperty("/PurchaseOrders") || [];

            aData.push({
                Description: "",
                Unit: "",
                Amount: "",
                Currency: ""
            });

            oModel.setProperty("/PurchaseOrders", aData);

        },
        PO_onCloseFrag: function () {
            this.PO_oDialog.close();
            // var oModel = this.getView().getModel("PurchaseOrderModel");

            // // Clear the PurchaseOrders array
            // oModel.setProperty("/PurchaseOrders", []);


        },
        PO_onComboBoxChange: function () {
            var Customer = this.getView().getModel("ManageCustomerModel").getData().find(function (cust) {
                return cust.name === sap.ui.getCore().byId("PO_id_CustomerName").getSelectedKey();
                return cust.PAN === sap.ui.getCore().byId("PO_id_PanNo").getValue();
            });
            this.getView().getModel("PurchaseOrderModel").setProperty("/Address", Customer.address);
            this.getView().getModel("PurchaseOrderModel").setProperty("/PAN", Customer.PAN);

            sap.ui.getCore().byId("PO_id_Address").setEditable(false);
            sap.ui.getCore().byId("PO_id_PanNo").setEditable(false);
            sap.ui.getCore().byId("PO_id_CustomerName").setValueState("None");
        },
        PO_onAmountInputChange:function(oEvent){
            utils._LCvalidateAmount(oEvent);
        },
       
           PO_onsavepress: function () {
            var Table = this.getView().byId("PO_id_Table");
            var selectedItem = Table.getSelectedItem();
            var oModel = this.getView().getModel("PurchaseOrderModel").getData()

            if (utils._LCvalidateMandatoryField(sap.ui.getCore().byId("PO_id_CustomerName"), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId("PO_id_Address"), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId("PO_id_PanNo"), "ID")
                && utils._LCvalidateDate(sap.ui.getCore().byId("PO_id_StartDate"), "ID") &&
                utils._LCvalidateDate(sap.ui.getCore().byId("PO_id_EndDate"), "ID")
                &&
                utils._LCvalidateDate(sap.ui.getCore().byId("PO_id_Date"), "ID")

            ) {
                var data = {
                    "CustomerName": oModel.CustomerName,
                    "Address": oModel.Address,
                    "StartDate": oModel.StartDate.split('/').reverse().join('-'),
                    "EndDate": oModel.EndDate.split('/').reverse().join('-'),
                    "PAN": oModel.PAN,
                    "CurrentDate": oModel.CurrentDate.split('/').reverse().join('-'),
                    "Type": oModel.Type || "internal"

                };
              


                var Items = this.getView().getModel("PurchaseOrderModel").getProperty("/PurchaseOrders").map(function (item) {
                    return {
                        data: {
                            "Description": item.Description,
                            "Unit": item.Unit,
                            "Amount": item.Amount,
                            "Currency": item.Currency || "INR"
                        }
                    }

                })
               
                 
                
                if (!selectedItem) {
                     var oPayLoad = {
                    data,
                    Items
                }
                    this.ajaxCreateWithJQuery("PurchaseOrder", oPayLoad);
                this.PO_ReadCall()

                } else {
                     const filters = {
                    PoNumber:selectedItem.getBindingContext("POModel").getObject().PoNumber
                }
                    var PayLoad = {
                    data,
                    filters,
                    Items
                }
                     this.ajaxUpdateWithJQuery("PurchaseOrder",PayLoad);
                this.PO_ReadCall()


                 }
                // var oModel = this.getView().getModel("PurchaseOrderModel");
                // oModel.setProperty("/PurchaseOrders", []);
                this.PO_oDialog.close();

            } else {
                MessageToast.show(this.i18nModel.getText("mandatoryFieldsError"));

            }
        },
        PO_ReadCall: async function () {
            this.getBusyDialog()
            await this.ajaxReadWithJQuery("PurchaseOrder").then((oData) => {
                var oFCIAerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                this.getOwnerComponent().setModel(new JSONModel(oFCIAerData), "POModel");
            });
            this.closeBusyDialog()
        },
        PO_onDeleteButtonPress:function(){
            var Table = this.getView().byId("PO_id_Table");
            var selectedItem = Table.getSelectedItem();
            if (!selectedItem) {
                return;
            }
            var PoNumber = selectedItem.getBindingContext("POModel").getProperty("PoNumber");
            this.showConfirmationDialog(
                "Delete Confirmation",
                "Are you sure you want to delete this Purchase Order?",
                () => {
                    this.ajaxDeleteWithJQuery("PurchaseOrder", {filters: {PoNumber: PoNumber}}).then(() => {
                        this.PO_ReadCall();
                    });
                }
            );
        },       
           onColumnListItemPress: function (oEvent) {

                var PoNumber = oEvent.getSource().getBindingContext("POModel").getObject().PoNumber;
                var onav = this.getOwnerComponent().getRouter()
                onav.navTo("PurchaseOrderObject", {
                    sPath: PoNumber
                })
            }

    });
});