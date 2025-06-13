
sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "../utils/validation",
    "sap/m/MessageToast",
    "../utils/CommonAgreementPDF"
], function (
    BaseController,
    JSONModel,
    utils,
    MessageToast,
    jsPDF
) {
    "use strict";

    return BaseController.extend("sap.kt.com.minihrsolution.controller.PurchaseOrderObject", {
        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("PurchaseOrderObject").attachMatched(this._onRouteMatched, this);
        },
        _onRouteMatched: async function (oEvent) {
            var LoginFunction = await this.commonLoginFunction("PurchaseOrder");
            if (!LoginFunction) return;
            this.getBusyDialog()
            this.PoNumber = oEvent.getParameter("arguments").sPath;

            this.byId("FPO_id_CustomerName").setEditable(true)
            this.getView().byId("POO_idSubmitButton").setVisible(true)
            this.getView().byId("POO_idSaveButton").setVisible(false)
            this.getView().byId("POO_ideditButton").setVisible(false)
            this.getView().byId("FPO_id_LUT").setVisible(false)

            this.byId("FPO_id_StartDate").setEditable(true)
            this.byId("FPO_id_EndDate").setEditable(true)
            this.byId("FPO_id_Date").setEditable(true)
            this.byId("PO_id_Type").setEditable(true)
            this.byId("FPO_idRichTextEditor").setEditable(true)
            this.byId("POO_idAddItemButton").setVisible(true)
            this.byId("FPO_id_BranchCode").setEditable(true)

            this.getView().byId("POO_idmailButton").setVisible(false)
            this.getView().byId("POO_idPDFButton").setVisible(false)
            var Layout = this.byId("ObjectPageLayout");
            Layout.setSelectedSection(this.byId("purchaseOrderHeaderSection1"));
            this.i18nModel = this.getView().getModel("i18n").getResourceBundle();



            await this._fetchCommonData("ManageCustomer", "ManageCustomerModel");
            this._fetchCommonData("Currency", "CurrencyModel");
            await this._fetchCommonData("CompanyCodeDetails", "CompanyCodeDetailsModel");

            this.getView().byId("FPO_id_StartDate").setMinDate(null)
            var sdate = this.getView().byId("FPO_id_StartDate")
            var enddate = this.getView().byId("FPO_id_EndDate");

            this.getView().byId("FPO_id_StartDate").attachChange(function (oEvent) {
                var startDate = oEvent.getSource().getDateValue();
                enddate.setMinDate(startDate);
                sdate.setMinDate(startDate)
            });
            this.getView().byId("FPO_id_Date").setMinDate(new Date());


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
                "Notes": "",
                "GSTIN": "",
                "customerEmail": "",
                "mobileNo": "",
                "Tax": "",
                "LUT": "",
                "STDCode": "",
                "Period": "",
                "SubTotal": "",
                "IGST": "",
                "CGST": "",
                "SGST": "",
                "GSTType": "",
                "GrantTotal": "",
                "SerialNo": "",
                "TotalAmount": "",
                "BranchCode": "",
                "CompanyName": "",
                "CompanyPANNo": "",
                "CompanyGSTNo": "",
                "CompanyEmail": "",
                "CompanyAddress": "",
                "PurchaseOrders": [],

            })
            this.getView().setModel(model, "PurchaseOrderModel");
            this.getView().getModel("PurchaseOrderModel").setProperty("/Editable", true);

            this._ViewDatePickersReadOnly(["FPO_id_StartDate", "FPO_id_EndDate", "FPO_id_Date"], this.getView());

            var data = `
                <div style="text-align: justify;">
                    <h3>Terms And Conditions</h3>
                        <ul>
                            <li>Consultant should get time sheet approval from project manager on or before last date for every month.</li>
                            <li>Contract from KAAR TECHNOLOGIES INDIA PRIVATE LIMITED - SEZ UNIT (GST will not be applicable).</li>
                            <li>In case of any leaves availed, it will be considered as LOP. If so, the per day cost to be calculated with (30 days).</li>
                            <li>The invoice should be raised monthly once, upon customer approved days in Timesheet payment will be made.</li>
                            <li>Payment will be 15-20 days from the date of approved invoice.</li>
                            <li>Consultant <strong>(Mehak)</strong> will not discuss any commercial/contractual points with the end customer.</li>
                            <li>The above-mentioned “3rd” clause is applicable only for month rate-based consultants.</li>
                        </ul>
                </div>`;
            this.getView().getModel("PurchaseOrderModel").setProperty("/Notes", data);

            if (oEvent.getParameter("arguments").sPath !== "PurchaseOrder") {
                this.getView().byId("POO_idSubmitButton").setVisible(false)
                this.getView().byId("POO_idSaveButton").setVisible(true)
                this.getView().byId("POO_ideditButton").setVisible(true)

                this.PoNumber = oEvent.getParameter("arguments").sPath;
                await this.ajaxReadWithJQuery("PurchaseOrderItems", { PoNumber: this.PoNumber }).then((oData) => {
                    var oFCIAerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                    this.getOwnerComponent().setModel(new JSONModel(oFCIAerData), "objectModel");

                    const purchaseOrderData = oFCIAerData[0];
                    const purchaseOrderModel = this.getView().getModel("PurchaseOrderModel");

                    purchaseOrderModel.setProperty("/CustomerName", purchaseOrderData.PurchaseOrder[0].CustomerName);
                    purchaseOrderModel.setProperty("/Type", purchaseOrderData.PurchaseOrder[0].Type);
                    purchaseOrderModel.setProperty("/Address", purchaseOrderData.PurchaseOrder[0].Address);
                    purchaseOrderModel.setProperty("/StartDate", new Date(purchaseOrderData.PurchaseOrder[0].StartDate).toLocaleDateString('en-GB')); purchaseOrderModel.setProperty("/EndDate", purchaseOrderData.PurchaseOrder[0].EndDate);
                    purchaseOrderModel.setProperty("/PAN", purchaseOrderData.PurchaseOrder[0].PAN);
                    purchaseOrderModel.setProperty("/CurrentDate", new Date(purchaseOrderData.PurchaseOrder[0].CurrentDate).toLocaleDateString('en-GB'));
                    purchaseOrderModel.setProperty("/EndDate", new Date(purchaseOrderData.PurchaseOrder[0].EndDate).toLocaleDateString('en-GB'));
                    purchaseOrderModel.setProperty("/GSTIN", purchaseOrderData.PurchaseOrder[0].GST);
                    purchaseOrderModel.setProperty("/mobileNo", purchaseOrderData.PurchaseOrder[0].MobileNumber);
                    purchaseOrderModel.setProperty("/customerEmail", purchaseOrderData.PurchaseOrder[0].Email);
                    purchaseOrderModel.setProperty("/PurchaseOrders", purchaseOrderData.PurchaseOrderItems);
                    purchaseOrderModel.setProperty("/Notes", purchaseOrderData.PurchaseOrder[0].Notes);
                    purchaseOrderModel.setProperty("/STDCode", purchaseOrderData.PurchaseOrder[0].STDCode);
                    purchaseOrderModel.setProperty("/Tax", purchaseOrderData.PurchaseOrder[0].TaxPercentage);
                    purchaseOrderModel.setProperty("/CompanyName", purchaseOrderData.PurchaseOrder[0].CompanyName);
                    purchaseOrderModel.setProperty("/CompanyAddress", purchaseOrderData.PurchaseOrder[0].CompanyAddress);
                    purchaseOrderModel.setProperty("/CompanyEmail", purchaseOrderData.PurchaseOrder[0].CompanyEmail);
                    purchaseOrderModel.setProperty("/CompanyGSTNo", purchaseOrderData.PurchaseOrder[0].CompanyGSTNo);
                    purchaseOrderModel.setProperty("/CompanyPANNo", purchaseOrderData.PurchaseOrder[0].CompanyPANNo);
                    purchaseOrderModel.setProperty("/BranchCode", purchaseOrderData.PurchaseOrder[0].BranchCode);
                    purchaseOrderModel.setProperty("/SubTotal", purchaseOrderData.PurchaseOrder[0].SubTotal);

                    purchaseOrderModel.setProperty("/IGST", purchaseOrderData.PurchaseOrder[0].IGST);

                    purchaseOrderModel.setProperty("/CGST", purchaseOrderData.PurchaseOrder[0].CGST);

                    purchaseOrderModel.setProperty("/SGST", purchaseOrderData.PurchaseOrder[0].SGST);
                    purchaseOrderModel.setProperty("/TotalAmount", purchaseOrderData.PurchaseOrder[0].TotalAmount);
                    purchaseOrderModel.setProperty("/GrantTotal", purchaseOrderData.PurchaseOrder[0].GrantTotal);







                    const purchaseOrders = purchaseOrderData.PurchaseOrderItems;
                    purchaseOrders.forEach((item, index) => {
                        item.SerialNo = (index + 1).toString();
                    });
                    purchaseOrderModel.setProperty("/PurchaseOrders", purchaseOrders);


                    this.byId("FPO_id_CustomerName").setEditable(false)
                    this.byId("FPO_id_StartDate").setEditable(false)
                    this.byId("FPO_id_EndDate").setEditable(false)
                    this.byId("FPO_id_Date").setEditable(false)
                    this.byId("PO_id_Type").setEditable(false)
                    this.byId("FPO_id_BranchCode").setEditable(false)

                    this.byId("FPO_idRichTextEditor").setEditable(false)
                    this.byId("POO_idAddItemButton").setVisible(false)
                    this.getView().byId("POO_idSaveButton").setVisible(false)
                    this.getView().byId("POO_idClearButton").setVisible(false)
                    this.getView().byId("POO_idmailButton").setVisible(true)
                    this.getView().byId("POO_idPDFButton").setVisible(true)
                    purchaseOrderModel.setProperty("/Editable", false);
                    // this.byId("PO_id_Consultantname").setEditable(false)
                });
            }




            this.closeBusyDialog()
        },
        PO_onButtonPress: function () {
            this.getRouter().navTo("PurchaseOrder");

        },
        PO_onComboBoxChange: function () {
            var selectedkey = this.byId("FPO_id_CustomerName").getSelectedKey();
            var Customer = this.getView().getModel("ManageCustomerModel").getData().find(function (cust) {
                return cust.companyName === selectedkey
            });
            this.getView().getModel("PurchaseOrderModel").setProperty("/Address", Customer.address);
            this.getView().getModel("PurchaseOrderModel").setProperty("/PAN", Customer.PAN);
            this.getView().getModel("PurchaseOrderModel").setProperty("/GSTIN", Customer.GST);
            this.getView().getModel("PurchaseOrderModel").setProperty("/customerEmail", Customer.customerEmail);
            this.getView().getModel("PurchaseOrderModel").setProperty("/mobileNo", Customer.mobileNo);
            this.getView().getModel("PurchaseOrderModel").setProperty("/Tax", Customer.value);
            this.getView().getModel("PurchaseOrderModel").setProperty("/STDCode", Customer.stdCode);
            this.getView().getModel("PurchaseOrderModel").setProperty("/GSTType", Customer.type);



            if (Customer.LUT && Customer.LUT.trim() !== "") {
                this.getView().byId("FPO_id_LUT").setVisible(true)
                this.getView().getModel("PurchaseOrderModel").setProperty("/LUT", Customer.LUT);
            } else {
                this.getView().byId("FPO_id_LUT").setVisible(false)

            }
        var length=this.getView().getModel("PurchaseOrderModel").getProperty("/PurchaseOrders").length > 0
                  if(length==false){
            var oModel=this.getView().getModel("PurchaseOrderModel")
                oModel.setProperty("/IGST", "");
               oModel.setProperty("/CGST", "");
               oModel.setProperty("/SGST", "");
              oModel.setProperty("/GrantTotal", "");
              oModel.setProperty("/SubTotal", "0.00");
            }
            this._updateGSTandGrantTotal()

            this.byId("FPO_id_CustomerName").setValueState("None");
        },
        PO_onComboBoxBranchChange: function () {
            var selectedkey = this.byId("FPO_id_BranchCode").getSelectedKey();
            var Customer = this.getView().getModel("CompanyCodeDetailsModel").getData().find(function (cust) {
                return cust.branchCode === selectedkey
            });
            this.getView().getModel("PurchaseOrderModel").setProperty("/CompanyName", Customer.companyName);
            this.getView().getModel("PurchaseOrderModel").setProperty("/CompanyAddress", Customer.longAddress);
            this.getView().getModel("PurchaseOrderModel").setProperty("/CompanyGSTNo", Customer.gstin);
            this.getView().getModel("PurchaseOrderModel").setProperty("/CompanyEmail", Customer.carrerEmail);
            this.getView().getModel("PurchaseOrderModel").setProperty("/CompanyPANNo", Customer.pan);


            this.byId("FPO_id_BranchCode").setValueState("None");

        },
        onAddItemButtonPress: function () {
            var oModel = this.getView().getModel("PurchaseOrderModel");
            var aData = oModel.getProperty("/PurchaseOrders") || [];

            aData.push({
                SerialNo: aData.length + 1,
                ConsultantName: "",
                Description: "",
                Unit: "",
                Amount: "",
                Currency: "",
                Period: "",
                TotalAmount: ""
            });

            oModel.setProperty("/PurchaseOrders", aData);
        },
        PO_onAmountInputChange: function (oEvent) {
            utils._LCvalidateAmount(oEvent);
            var oInput = oEvent.getSource();
            var oContext = oInput.getBindingContext("PurchaseOrderModel");
            var sPath = oContext.getPath();
            var model = this.getView().getModel("PurchaseOrderModel");

            var oParent = oInput.getParent();
            var aItems = oParent.getCells();
            var sUnit = aItems[3].getValue();
            var sAmount = aItems[4].getValue();

            var fUnit = parseFloat(sUnit);
            var fAmount = parseFloat(sAmount);

            if (!isNaN(fUnit) && !isNaN(fAmount)) {
                var fTotal = fUnit * fAmount;
                model.setProperty(sPath + "/TotalAmount", fTotal.toFixed(2));
            } else {
                model.setProperty(sPath + "/TotalAmount", "");
            }
            var aPOs = model.getProperty("/PurchaseOrders");
            var fSubTotal = 0;

            aPOs.forEach(function (item) {
                var fItemTotal = parseFloat(item.TotalAmount);
                if (!isNaN(fItemTotal)) {
                    fSubTotal += fItemTotal;
                }
            });

            model.setProperty("/SubTotal", fSubTotal.toFixed(2));

            var tax = this.getView().byId("FPO_id_tax").getValue()
            var GSTtype = this.getView().byId("FPO_id_type").getValue()

            if (GSTtype == "IGST") {
                var GST = fSubTotal * tax / 100
                model.setProperty("/IGST", GST.toFixed(2));
            } else {
                var GST = fSubTotal * tax / 100
                model.setProperty("/CGST", GST.toFixed(2));
                model.setProperty("/SGST", GST.toFixed(2));
            }



            var Total = GST + fSubTotal
            model.setProperty("/GrantTotal", Total.toFixed(2));

            this._updateGSTandGrantTotal()


        },
        _updateGSTandGrantTotal: function () {
            var model = this.getView().getModel("PurchaseOrderModel");
            var fSubTotal = parseFloat(model.getProperty("/SubTotal"));

            var tax = this.getView().byId("FPO_id_tax").getValue()
            var GSTtype = this.getView().byId("FPO_id_type").getValue()

                var GST = fSubTotal * tax / 100
                model.setProperty("/IGST", GST.toFixed(2));
                model.setProperty("/CGST", GST.toFixed(2));
                model.setProperty("/SGST", GST.toFixed(2));


            if(GSTtype=="IGST"){
            var Total = GST + fSubTotal
            model.setProperty("/GrantTotal", Total.toFixed(2));
            }else{
            var Total = GST + GST +fSubTotal
            model.setProperty("/GrantTotal", Total.toFixed(2));
           }
        },
        POO_onSubmitButtonPress: async function () {

            var purchaseOrders = this.getView().getModel("PurchaseOrderModel").getProperty("/PurchaseOrders");


            var oModel = this.getView().getModel("PurchaseOrderModel").getData()
            try {
                if (utils._LCvalidateMandatoryField(this.getView().byId("FPO_id_BranchCode"), "ID") &&
                    utils._LCvalidateMandatoryField(this.getView().byId("FPO_id_CustomerName"), "ID")
                    && utils._LCvalidateDate(this.getView().byId("FPO_id_StartDate"), "ID") &&
                    utils._LCvalidateDate(this.getView().byId("FPO_id_EndDate"), "ID")
                    &&
                    utils._LCvalidateDate(this.getView().byId("FPO_id_Date"), "ID") &&


                    this.getView().getModel("PurchaseOrderModel").getProperty("/PurchaseOrders").length > 0
                ) {
                    var isValid = this.getView().getModel("PurchaseOrderModel").getProperty("/PurchaseOrders").every(function (item) {
                        if (!item.Description || !item.Unit || !item.Amount || !item.ConsultantName) {
                            sap.m.MessageBox.error("Please complete all fields for each item row.")
                            return false;
                        }
                        return true;
                    });
                    if (!isValid) {
                        return;
                    }
                    var notes = this.getView().getModel("PurchaseOrderModel").getProperty("/Notes")
                    if (!notes) {
                        MessageToast.show(this.i18nModel.getText("quotaionNotemsg"));
                        return;
                    }
                    var data = {
                        "CustomerName": oModel.CustomerName,
                        "Address": oModel.Address,
                        "StartDate": oModel.StartDate.split('/').reverse().join('-'),
                        "EndDate": oModel.EndDate.split('/').reverse().join('-'),
                        "PAN": oModel.PAN,
                        "CurrentDate": oModel.CurrentDate.split('/').reverse().join('-'),
                        "Type": oModel.Type || "internal",
                        "Notes": oModel.Notes,
                        "MobileNumber": oModel.mobileNo || "",
                        "GST": oModel.GSTIN || "",
                        "Email": oModel.customerEmail,
                        "TaxPercentage": oModel.Tax || "",
                        "STDCode": oModel.STDCode || "",
                        "LUT": oModel.LUT || "",
                        "BranchCode": oModel.BranchCode,
                        "CompanyName": oModel.CompanyName,
                        "CompanyPANNo": oModel.CompanyPANNo || "",
                        "CompanyGSTNo": oModel.CompanyGSTNo,
                        "CompanyEmail": oModel.CompanyEmail,
                        "CompanyAddress": oModel.CompanyAddress,
                        "SubTotal": oModel.SubTotal,
                        "IGST": oModel.IGST,
                        "CGST": oModel.CGST,
                        "SGST": oModel.SGST,
                        "GrantTotal": oModel.GrantTotal,
                        "GSTType": oModel.GSTType,
                        "TotalAmount":oModel.TotalAmount



                    };
                    var Items = this.getView().getModel("PurchaseOrderModel").getProperty("/PurchaseOrders").map(function (item, index) {

                        var itemObj = {
                            data: {
                                "ConsultantName": item.ConsultantName,
                                "Description": item.Description,
                                "Unit": item.Unit,
                                "Amount": item.Amount,
                                "Currency": item.Currency || "INR",
                                "Period": item.Period || "Per Day"
                            }
                        };
                        // if (selectedItem) {
                        //     if (item.ItemId) {
                        //         itemObj.filters = { ItemId: item.ItemId };
                        //     }
                        //     else {
                        //         itemObj.filters = { flag: "create", PoNumber: selectedItem.getBindingContext("POModel").getObject().PoNumber };
                        //         itemObj.data.PoNumber = selectedItem.getBindingContext("POModel").getObject().PoNumber;

                        //     }
                        // }
                        return itemObj;
                    });

                    var oPayLoad = {
                        data,
                        Items
                    }
                    this.getBusyDialog();
                    await this.ajaxCreateWithJQuery("PurchaseOrder", oPayLoad);
                    await this.onSuccessDialog();
                    this.closeBusyDialog();


                } else {
                    MessageToast.show(this.i18nModel.getText("mandatoryFieldsError"));

                }
            }
            catch (e) {
                MessageToast.show(this.i18nModel.getText("technicalError"));

                console.error(e);
            }
        },
        onSuccessDialog: function () {
            if (!this._oDialog) {
                this._oDialog = new sap.m.Dialog({
                    title: "Success",
                    type: "Message",
                    state: "Success",
                    content: new sap.m.Text({
                        text: "Purchase Order Created Successfully"
                    }),
                    endButton: new sap.m.Button({
                        text: "OK",
                        type: "Accept",
                        press: function () {
                            this._oDialog.close();
                            this.getRouter().navTo("PurchaseOrder");

                        }.bind(this)
                    }),

                });
                this.getView().addDependent(this._oDialog);
            }
            this._oDialog.open();
        },
        POO_onSaveButtonPress: async function (oEvent) {
            this.getRouter().getRoute("PurchaseOrder")
            const purchaseOrderModel = this.getView().getModel("PurchaseOrderModel");

            var oModel = this.getView().getModel("PurchaseOrderModel").getData()


            if (utils._LCvalidateMandatoryField(this.getView().byId("FPO_id_BranchCode"), "ID") &&
                utils._LCvalidateMandatoryField(this.getView().byId("FPO_id_CustomerName"), "ID")
                && utils._LCvalidateDate(this.getView().byId("FPO_id_StartDate"), "ID") &&
                utils._LCvalidateDate(this.getView().byId("FPO_id_EndDate"), "ID") &&
                utils._LCvalidateDate(this.getView().byId("FPO_id_Date"), "ID") &&
                this.getView().getModel("PurchaseOrderModel").getProperty("/PurchaseOrders").length > 0
            ) {
                var isValid = this.getView().getModel("PurchaseOrderModel").getProperty("/PurchaseOrders").every(function (item) {
                    if (!item.Description || !item.Unit || !item.Amount || !item.ConsultantName) {
                        sap.m.MessageBox.error("Please fill in all required fields for each row.")
                        return false;
                    }
                    return true;
                });
                if (!isValid) {
                    return;
                }
                var notes = this.getView().getModel("PurchaseOrderModel").getProperty("/Notes")
                if (!notes) {
                    MessageToast.show(this.i18nModel.getText("quotaionNotemsg"));
                    return;
                }


                var data = {
                    "CustomerName": oModel.CustomerName,
                    "Address": oModel.Address,
                    "StartDate": oModel.StartDate.split('/').reverse().join('-'),
                    "EndDate": oModel.EndDate.split('/').reverse().join('-'),
                    "PAN": oModel.PAN,
                    "CurrentDate": oModel.CurrentDate.split('/').reverse().join('-'),
                    "Type": oModel.Type || "internal",
                    "Notes": oModel.Notes,
                    "MobileNumber": oModel.mobileNo || "",
                    "GST": oModel.GSTIN || "",
                    "Email": oModel.customerEmail,
                    "TaxPercentage": oModel.Tax || "",
                    "STDCode": oModel.STDCode || "",
                    "LUT": oModel.LUT || "",
                    "BranchCode": oModel.BranchCode,
                    "CompanyName": oModel.CompanyName,
                    "CompanyPANNo": oModel.CompanyPANNo || "",
                    "CompanyGSTNo": oModel.CompanyGSTNo,
                    "CompanyEmail": oModel.CompanyEmail,
                    "CompanyAddress": oModel.CompanyAddress,

                };
                var Items = this.getView().getModel("PurchaseOrderModel").getProperty("/PurchaseOrders").map(function (item, index) {

                    var itemObj = {
                        data: {
                            "ConsultantName": item.ConsultantName,
                            "Description": item.Description,
                            "Unit": item.Unit,
                            "Amount": item.Amount,
                            "Currency": item.Currency || "INR",
                            "Period": item.Period || "Per Day"
                        }
                    };
                    if (item.ItemId) {
                        itemObj.filters = { ItemId: item.ItemId };
                    }
                    else {
                        itemObj.filters = { flag: "create", PoNumber: this.PoNumber };
                        itemObj.data.PoNumber = this.PoNumber;

                    }
                    return itemObj;
                }.bind(this));

                const filters = {
                    PoNumber: this.PoNumber,

                }
                var PayLoad = {
                    data,
                    filters,
                    Items,
                }
                this.getBusyDialog()
                await this.ajaxUpdateWithJQuery("PurchaseOrder", PayLoad);
                MessageToast.show(this.i18nModel.getText("purchaseOrderupdated"));
                this.closeBusyDialog()

                this.getView().byId("POO_idSaveButton").setVisible(false)
                this.getView().byId("POO_ideditButton").setVisible(true)
                this.byId("FPO_id_CustomerName").setEditable(false)
                this.byId("FPO_id_StartDate").setEditable(false)
                this.byId("FPO_id_EndDate").setEditable(false)
                this.byId("FPO_id_Date").setEditable(false)
                this.byId("PO_id_Type").setEditable(false)
                this.byId("FPO_idRichTextEditor").setEditable(false)
                this.byId("POO_idAddItemButton").setVisible(false)
                this.byId("POO_idClearButton").setVisible(false)
                this.byId("FPO_id_BranchCode").setEditable(false)
                purchaseOrderModel.setProperty("/Editable", false);
            } else {
                MessageToast.show(this.i18nModel.getText("mandatoryFieldsError"));

            }

        },
        onClearNotesPress: function () {
            this.getView().getModel("PurchaseOrderModel").setProperty("/Notes", "")
        },
        POO_onEditButtonPress: function () {
            const purchaseOrderModel = this.getView().getModel("PurchaseOrderModel");

            this.byId("FPO_id_CustomerName").setEditable(true)
            this.byId("FPO_id_StartDate").setEditable(true)
            this.byId("FPO_id_EndDate").setEditable(true)
            this.byId("FPO_id_Date").setEditable(true)
            this.byId("PO_id_Type").setEditable(true)
            this.byId("FPO_idRichTextEditor").setEditable(true)
            this.byId("POO_idAddItemButton").setVisible(true)
            this.byId("POO_idClearButton").setVisible(true)
            this.byId("FPO_id_BranchCode").setEditable(true)



            purchaseOrderModel.setProperty("/Editable", true);
            this.getView().byId("POO_idSaveButton").setVisible(true)

        },
        FPO_onDateChange: function (oEvent) {
            utils._LCvalidateDate(oEvent)
        },
        PO_onConsultantnameLiveChange: function (oEvent) {
            utils._LCvalidateName(oEvent)
        },
        POO_onPOTableDelete: async function (oEvent) {
            const purchaseOrderModel = this.getView().getModel("PurchaseOrderModel");
            const oTable = this.byId("idTable");
            oTable.setMode(purchaseOrderModel.getProperty("/Editable") ? "Delete" : "None");

            var oSelectedItem = oEvent.getParameter("listItem");
            var oModel = this.getView().getModel("PurchaseOrderModel");
            var oData = oModel.getProperty("/PurchaseOrders");
            var sPath = oSelectedItem.getBindingContext("PurchaseOrderModel").getPath();
            var iIndex = parseInt(sPath.split("/")[2]);
            var oDeletedItem = oData[iIndex];

            if (oDeletedItem.ItemId) {
                var payload = {
                    filters: {
                        ItemId: oDeletedItem.ItemId
                    }
                };

                this.ajaxDeleteWithJQuery("PurchaseOrderItems", payload)
                this.showConfirmationDialog(
                    "Delete Confirmation",
                    "Are you sure you want to delete this Purchase Order?",
                    () => {
                        this.getBusyDialog()
                        this.ajaxDeleteWithJQuery("PurchaseOrderItems", payload).then(() => {
                            MessageToast.show(this.i18nModel.getText("purchaseOrderDeleted"));
                            oData.splice(iIndex, 1);
                            oData.forEach(function (item, index) {
                                item.SerialNo = index + 1;
                            });
                            oModel.setProperty("/PurchaseOrders", oData);
                            if (oData.length === 0) {
                                oModel.setProperty("/SubTotal", "0.00");
                                oModel.setProperty("/IGST", "");
                                oModel.setProperty("/CGST", "");
                                oModel.setProperty("/SGST", "");
                                oModel.setProperty("/GrantTotal", "0.00");
                            } else {
                                var fSubTotal = 0;
                                oData.forEach(function (item) {
                                    var total = parseFloat(item.TotalAmount);
                                    if (!isNaN(total)) fSubTotal += total;
                                });
                                oModel.setProperty("/SubTotal", fSubTotal.toFixed(2));
                                this._updateGSTandGrantTotal(); // or inline GST logic
                            }
                            this.closeBusyDialog()
                        });
                    },
                );
            } else {
                oData.splice(iIndex, 1);
                oData.forEach(function (item, index) {
                    item.SerialNo = index + 1;
                });
                oModel.setProperty("/PurchaseOrders", oData);
                         if (oData.length === 0) {

                                oModel.setProperty("/SubTotal", "0.00");
                                oModel.setProperty("/IGST", "");
                                oModel.setProperty("/CGST", "");
                                oModel.setProperty("/SGST", "");
                                oModel.setProperty("/GrantTotal", "0.00");
                            } else {
                                var fSubTotal = 0;
                                oData.forEach(function (item) {
                                    var total = parseFloat(item.TotalAmount);
                                    if (!isNaN(total)) fSubTotal += total;
                                });
                                oModel.setProperty("/SubTotal", fSubTotal.toFixed(2));
                                this._updateGSTandGrantTotal(); // or inline GST logic
                            }
            }
        },

        POO_onPDFButtonPress: async function () {
            var oPDFModel = this.getView().getModel("PDFData");
            var oPOModel = this.getView().getModel("PurchaseOrderModel").getData();
            oPDFModel.setProperty("/ClientCompanyName", oPOModel.CustomerName);
            oPDFModel.setProperty("/ClientCompanyAddress", oPOModel.Address);
            oPDFModel.setProperty("/ClientCompanyPAN", oPOModel.PAN);
            oPDFModel.setProperty("/PONumber", oPOModel.PONumber || "12345");
            oPDFModel.setProperty("/POType", oPOModel.Type);
            oPDFModel.setProperty("/POFrom", oPOModel.StartDate);
            oPDFModel.setProperty("/POTo", oPOModel.EndDate);
            oPDFModel.setProperty("/PODate", oPOModel.CurrentDate);
            oPDFModel.setProperty("/POItems", oPOModel.PurchaseOrders);
            oPDFModel.setProperty("/TotalPOAmount", oPOModel.TotalAmount || "98765");
            oPDFModel.setProperty("/POAmountInWords", oPOModel.AmountInWords || "Ninety eight thousand seven sixty five rupees only");
            var htmlContent = oPOModel.Notes;
            await this._fetchCommonData("CompanyCodeDetails", "CompanyCodeDetailsModel", { branchCode: "KLB01" });
            var oCompanyDetailsModel = this.getView().getModel("CompanyCodeDetailsModel").getProperty("/0");
            if (!oCompanyDetailsModel.companylogo64 && !oCompanyDetailsModel.signature64 && !oCompanyDetailsModel.backgroundLogoBase64 && !oCompanyDetailsModel.emailLogoBase64) {
                try {
                    const logoBlob = new Blob([new Uint8Array(oCompanyDetailsModel.companylogo?.data)], { type: "image/png" });
                    const signBlob = new Blob([new Uint8Array(oCompanyDetailsModel.signature?.data)], { type: "image/png" });
                    const backgroundBlob = new Blob([new Uint8Array(oCompanyDetailsModel.backgroundLogo?.data)], { type: "image/png" });
                    const emailBlob = new Blob([new Uint8Array(oCompanyDetailsModel.emailLogo?.data)], { type: "image/png" });

                    const [logoBase64, signBase64, backgroundBase64, emailBase64] = await Promise.all([
                        this._convertBLOBToImage(logoBlob),
                        this._convertBLOBToImage(signBlob),
                        this._convertBLOBToImage(backgroundBlob),
                        this._convertBLOBToImage(emailBlob)
                    ]);

                    oCompanyDetailsModel.companylogo64 = logoBase64;
                    oCompanyDetailsModel.signature64 = signBase64;
                    oCompanyDetailsModel.backgroundLogoBase64 = backgroundBase64;
                    oCompanyDetailsModel.emailLogoBase64 = emailBase64;
                } catch (err) {
                    console.error("Image compression failed:", err);
                    this.closeBusyDialog();
                }
            }
            if (oCompanyDetailsModel.companylogo64 && oCompanyDetailsModel.signature64) {
                if (typeof jsPDF !== "undefined" && typeof jsPDF._GeneratePOPDF === "function") {
                    jsPDF._GeneratePOPDF(this, oPDFModel.getData(), oCompanyDetailsModel, htmlContent);
                } else {
                    console.error("Error: jsPDF._GeneratePOPDF function not found.");
                    this.closeBusyDialog();
                }
            }
        }
    });
});