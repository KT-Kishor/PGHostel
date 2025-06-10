
sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "../utils/validation",
    "../model/formatter",
    "sap/m/MessageToast",
], function (
    BaseController,
    JSONModel,
    utils,
    formatter,
    MessageToast) {
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
                "Notes":"",
                "PurchaseOrders": [],

            })
            this.getView().setModel(model, "PurchaseOrderModel");

            this.getView().getModel("LoginModel").setProperty("/HeaderName", "Purchase Order");

        },
        onPressback: function () {
            this.getRouter().navTo("RouteTilePage");
        },
        onLogout: function () {
            this.CommonLogoutFunction()
        },
        PO_onCreatePurchaseOrder: function () {
            
            this.getRouter().navTo("PurchaseOrderObject",{sPath:"null"});
        },
        PO_onEditPurchaseOrder: async function (e) {

            var Table = this.getView().byId("PO_id_Table");
            var selectedItem = Table.getSelectedItem();
            if (!selectedItem) {
               MessageToast.show(this.i18nModel.getText("selectPurchaseOrder"));
                
                return;
            }
            this.getBusyDialog()
            var data = await this.ajaxReadWithJQuery("PurchaseOrderItems", { PoNumber: selectedItem.getBindingContext("POModel").getObject().PoNumber }).then((oData) => {
                var oFCIAerData = Array.isArray(oData.data) ? oData.data : [oData.data];
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
                    this._FragmentDatePickersReadOnly(["FPO_id_StartDate", "FPO_id_EndDate", "FPO_id_Date"]);


                    sap.ui.getCore().byId("FPO_id_CustomerName").setValue(data[0].PurchaseOrder[0].CustomerName)
                    oModel.setProperty("/CustomerName", data[0].PurchaseOrder[0].CustomerName);
                    oModel.setProperty("/Address", data[0].PurchaseOrder[0].Address);
                    oModel.setProperty("/PAN", data[0].PurchaseOrder[0].PAN);
                    oModel.setProperty("/Description", data.Description);
                    oModel.setProperty("/Type", data[0].PurchaseOrder[0].Type || "internal");
                    oModel.setProperty("/PurchaseOrders", data[0].PurchaseOrderItems);
                    oModel.setProperty("/Notes", data[0].PurchaseOrder[0].Notes);

                    // sap.ui.getCore().byId("PO_id_Description").setValue(data[0].PurchaseOrderItems[0].Description);
                    sap.ui.getCore().byId("FPO_id_StartDate").setDateValue(new Date(data[0].PurchaseOrder[0].StartDate));
                    sap.ui.getCore().byId("FPO_id_EndDate").setDateValue(new Date(data[0].PurchaseOrder[0].EndDate));
                    sap.ui.getCore().byId("FPO_id_Date").setDateValue(new Date(data[0].PurchaseOrder[0].CurrentDate));
                    sap.ui.getCore().byId("FPO_id_Address").setEditable(false);
                    sap.ui.getCore().byId("FPO_id_PanNo").setEditable(false);


                    this.PO_oDialog.open();
                    this.closeBusyDialog()
                }.bind(this));
            } else {
                this.PO_oDialog.open();
                    this.closeBusyDialog()

                    sap.ui.getCore().byId("FPO_id_CustomerName").setValue(data[0].PurchaseOrder[0].CustomerName)

                oModel.setProperty("/CustomerName", data[0].PurchaseOrder[0].CustomerName);
                oModel.setProperty("/Address", data[0].PurchaseOrder[0].Address);
                oModel.setProperty("/PAN", data[0].PurchaseOrder[0].PAN);
                oModel.setProperty("/Description", data.Description);
                oModel.setProperty("/Type", data[0].PurchaseOrder[0].Type || "internal");
                oModel.setProperty("/PurchaseOrders", data[0].PurchaseOrderItems);
                oModel.setProperty("/Notes", data[0].PurchaseOrder[0].Notes);


                // sap.ui.getCore().byId("PO_id_Description").setValue(data[0].PurchaseOrderItems[0].Description);

                sap.ui.getCore().byId("FPO_id_StartDate").setDateValue(new Date(data[0].PurchaseOrder[0].StartDate));
                sap.ui.getCore().byId("FPO_id_EndDate").setDateValue(new Date(data[0].PurchaseOrder[0].EndDate));
                sap.ui.getCore().byId("FPO_id_Date").setDateValue(new Date(data[0].PurchaseOrder[0].CurrentDate));
                sap.ui.getCore().byId("FPO_id_Address").setEditable(false);
                sap.ui.getCore().byId("FPO_id_PanNo").setEditable(false);

                this._FragmentDatePickersReadOnly(["FPO_id_StartDate", "FPO_id_EndDate", "FPO_id_Date"]);


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
            var oModel = this.getView().getModel("PurchaseOrderModel");

            // Clear the PurchaseOrders array
            oModel.setProperty("/PurchaseOrders", []);


        },
        PO_onComboBoxChange: function () {
            var Customer = this.getView().getModel("ManageCustomerModel").getData().find(function (cust) {
                return cust.name === this.getView().byId("FPO_id_CustomerName").getSelectedKey();
                return cust.PAN === this.getView().byId("FPO_id_PanNo").getValue();
            });
            this.getView().getModel("PurchaseOrderModel").setProperty("/Address", Customer.address);
            this.getView().getModel("PurchaseOrderModel").setProperty("/PAN", Customer.PAN);

            sap.ui.getCore().byId("FPO_id_Address").setEditable(false);
            sap.ui.getCore().byId("FPO_id_PanNo").setEditable(false);
            sap.ui.getCore().byId("FPO_id_CustomerName").setValueState("None");
        },
        PO_onAmountInputChange: function (oEvent) {
            utils._LCvalidateAmount(oEvent);
        },
        onDescriptionInputLiveChange: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent)
        },
        FPO_onDateChange:function(oEvent){
              utils._LCvalidateDate(oEvent)
        },

        PO_onsavepress: async function () {
            var Table = this.getView().byId("PO_id_Table");
            var selectedItem = Table.getSelectedItem();
            if (selectedItem) {
                var data1 = await this.ajaxReadWithJQuery("PurchaseOrderItems", { PoNumber: selectedItem.getBindingContext("POModel").getObject().PoNumber }).then((oData) => {
                    var oFCIAerData = oData.data;
                    return oFCIAerData;
                });
            }

            //  await this.ajaxReadWithJQuery("PurchaseOrderItems").then((oData) => {
            //     var PoData = Array.isArray(oData.data) ? oData.data : [oData.data];
            //     this.getOwnerComponent().setModel(new JSONModel(PoData), "POModel");
            //       this.closeBusyDialog()
            // });
            var oModel = this.getView().getModel("PurchaseOrderModel").getData()
            try{
            if (utils._LCvalidateMandatoryField(sap.ui.getCore().byId("FPO_id_CustomerName"), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId("FPO_id_Address"), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId("FPO_id_PanNo"), "ID")
                && utils._LCvalidateDate(sap.ui.getCore().byId("FPO_id_StartDate"), "ID") &&
                utils._LCvalidateDate(sap.ui.getCore().byId("FPO_id_EndDate"), "ID")
                &&
                utils._LCvalidateDate(sap.ui.getCore().byId("FPO_id_Date"), "ID")
                &&
              
               this.getView().getModel("PurchaseOrderModel").getProperty("/PurchaseOrders").every(function(item) {
                   return item.Description && item.Unit && item.Amount
               })&&this.getView().getModel("PurchaseOrderModel").getProperty("/Notes")&&     
               this.getView().getModel("PurchaseOrderModel").getProperty("/PurchaseOrders").length > 0         
               ) {
                var data = {
                    "CustomerName": oModel.CustomerName,
                    "Address": oModel.Address,
                    "StartDate": oModel.StartDate.split('/').reverse().join('-'),
                    "EndDate": oModel.EndDate.split('/').reverse().join('-'),
                    "PAN": oModel.PAN,
                    "CurrentDate": oModel.CurrentDate.split('/').reverse().join('-'),
                    "Type": oModel.Type || "internal",
                    "Notes": oModel.Notes 

                };
                var Items = this.getView().getModel("PurchaseOrderModel").getProperty("/PurchaseOrders").map(function (item, index) {

                    var itemObj = {
                        data: {
                          
                            "Description": item.Description,
                            "Unit": item.Unit,
                            "Amount": item.Amount,
                            "Currency": item.Currency || "INR"
                        }
                    };
                    if (selectedItem) {
                        if (item.ItemId) {
                            itemObj.filters = { ItemId: item.ItemId };
                        }
                        else {
                            itemObj.filters = { flag: "create", PoNumber: selectedItem.getBindingContext("POModel").getObject().PoNumber };
                            itemObj.data.PoNumber = selectedItem.getBindingContext("POModel").getObject().PoNumber;
                            
                        }
                    }
                    return itemObj;
                });

                if (!selectedItem) {
                    var oPayLoad = {
                        data,
                        Items
                    }
                    this.ajaxCreateWithJQuery("PurchaseOrder", oPayLoad);
                    MessageToast.show(this.i18nModel.getText("purchaseOrderCreated"));
              

                } else {
                    const filters = {
                        PoNumber: selectedItem.getBindingContext("POModel").getObject().PoNumber,

                    }
                    var PayLoad = {
                        data,
                        filters,
                        Items,
                    }
                    this.ajaxUpdateWithJQuery("PurchaseOrder", PayLoad);
                    MessageToast.show(this.i18nModel.getText("purchaseOrderupdated"));
                    
                    
                }
                this.PO_onSearch()
                var oModel = this.getView().getModel("PurchaseOrderModel");
                oModel.setProperty("/PurchaseOrders", []);
                this.PO_oDialog.close();

            } else {
                MessageToast.show(this.i18nModel.getText("mandatoryFieldsError"));

            }
        } 
            catch(e) {
               MessageToast.show(this.i18nModel.getText("technicalError"));

                    console.error(e);
            }
        },
        PO_ReadCall: async function () {
            this.getBusyDialog()
            await this.ajaxReadWithJQuery("PurchaseOrder").then((oData) => {
                var PoData = Array.isArray(oData.data) ? oData.data : [oData.data];
                this.getOwnerComponent().setModel(new JSONModel(PoData), "POModel");
                this.closeBusyDialog()
            });

        },
        PO_onDeleteButtonPress: function () {


            var Table = this.getView().byId("PO_id_Table");
            var selectedItem = Table.getSelectedItem();
            if (!selectedItem) {
                MessageToast.show(this.i18nModel.getText("selectPurchaseOrder"));
                return;
            }
            var PoNumber = selectedItem.getBindingContext("POModel").getProperty("PoNumber");
            this.showConfirmationDialog(
                "Delete Confirmation",
                "Are you sure you want to delete this Purchase Order?",
                () => {
                    this.ajaxDeleteWithJQuery("PurchaseOrder", { filters: { PoNumber: PoNumber } }).then(() => {
                        MessageToast.show(this.i18nModel.getText("purchaseOrderDeleted"));
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
        },
        PO_onSearch: function () {
            var CustName = this.getView().byId("PO_id_CustomerName").getSelectedKey()
            var Po = this.getView().byId("PO_id_PoNumber").getSelectedKey()
            var oDateRange = this.getView().byId("PO_idECreationDatePicker")
            var odateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" });
            var oStartDate = oDateRange.getDateValue();
            var oEndDate = oDateRange.getSecondDateValue();

            var filters = {}

            if (CustName) {
                filters.CustomerName = CustName;
            }
            if (Po) {
                filters.PoNumber = Po;
            }
            if (oStartDate && oEndDate) {
                filters.StartDate = odateFormat.format(oStartDate);
                filters.EndDate = odateFormat.format(oEndDate);
            }
            this.ajaxReadWithJQuery("PurchaseOrder", filters).then((oData) => {
                var PoData = Array.isArray(oData.data) ? oData.data : [oData.data];
                this.getOwnerComponent().setModel(new JSONModel(PoData), "POModel");

            });
        },
        PO_onPressClear: function () {
            this.getView().byId("PO_id_CustomerName").setSelectedKey("");
            this.getView().byId("PO_id_PoNumber").setSelectedKey("");
            this.getView().byId("PO_idECreationDatePicker").setValue("");
        },
        onClearNotesPress:function(){
            this.getView().getModel("PurchaseOrderModel").setProperty("/Notes","")
        }

    });
});