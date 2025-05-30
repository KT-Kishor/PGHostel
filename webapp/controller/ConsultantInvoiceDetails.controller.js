sap.ui.define(
  [
    "./BaseController", //call base controller
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "../utils/validation",
     "../model/formatter",
  ],
  function (
    BaseController,JSONModel,MessageToast,utils,Formatter
  ) {
    "use strict";
    return BaseController.extend(
      "sap.kt.com.minihrsolution.controller.ConsultantInvoiceDetails",
      {
        Formatter: Formatter,
        onInit: function () {
          this.getRouter().getRoute("RouteNavConsultantInvoiceApplication").attachMatched(this._onRouteMatched, this);
        },

       _onRouteMatched: async function(oEvent) {
        var LoginFUnction = await this.commonLoginFunction("ConsultantInvoice");
          if (!LoginFUnction) return;
                    this._makeDatePickersReadOnly(["CI_id_InDate", "CI_id_PaybyInv"]);
                    this.i18nModel = this.getView().getModel('i18n').getResourceBundle();
                     if(!this.getView().getModel("InvoiceSACModel")){
                        this._fetchCommonData("CompanyInvoiceSAC", "InvoiceSACModel");
                        this._fetchCommonData("Currency", "CurrencyModel");
                    }
                    this._fetchCommonData("EmailContent", "CCMailModel", {Type: "ConsultantInvoice"  });
                    this.CI_CommonID();
                    this.getView().byId("CI_id_ColumnGST").setVisible(false);
                    this.getView().byId("CI_id_GSTCalc").setVisible(false);
                    var sPath = oEvent.getParameter("arguments").sPath;
                    var oPath = oEvent.getParameter("arguments").oPath;
                    this.decodedPath = decodeURIComponent(decodeURIComponent(sPath));
                    this.decodedEmployeeID = decodeURIComponent(oPath);
                    this.Discount = true;
                    this.UnitAmount = true;

                    var oInvoiceModel = new JSONModel({
                    EmployeeID: "", ConsultantName: "", InvoiceTo: "", InvoiceAddress: "",
                    InvoiceNo: "", InvoiceDate: "", ConsultantAddress: "", GSTNO: "",
                    CompanyGSTNO: "", MobileNo: "", CGST: false, SGST: false, IGST: false,
                    BankName: "", AccountName: "", AccountNo: "", IFSCCode: "", PayBy: "",
                    GSTValid: false, CGSTSelected: false, IGSTSelected: false, Percentage: "",
                    Currency: "INR", STDCode: "+91"});
                    this.getView().setModel(oInvoiceModel, "ConsultantInvoiceModel");
           
                    var oInvoiceItemModel = new JSONModel({
                        SlNo: "", EmployeeID: "", Item: "", Days: "", SAC: "", UnitPrice: "",
                        Total: "", SubTotal: "", TotalSum: "", Currency: "INR"});
                    this.getView().setModel(oInvoiceItemModel, "oModelDataPro");
           
                    var visibilityPlay = new JSONModel({
                        createVisi: true, editVisi: false, editable: true,
                        invBtn: true, pasteBtn: true, merge: false });
                    this.getView().setModel(visibilityPlay, "visiablityPlay");

                  var loginModel = this.getOwnerComponent().getModel("LoginModel");
                    var oComboBox = this.getView().byId("CI_id_Cont");
                    var isEditMode = sPath !== "X" && oPath !== "Y";

                    if (loginModel) {
                        this.sUserType = loginModel.getProperty("/Role");

                        if (this.sUserType === "Admin" && !isEditMode) {
                            oComboBox.setVisible(true);
                        } else {
                            oComboBox.setVisible(false);
                        }
                    } else {
                        oComboBox.setVisible(false); 
                    }

                    if (sPath === "X" && oPath === "Y") {
                        this.readFunction("ConsultantInvoice", "ConsultantInvoiceModel", true);
                        this.readFunction("ConsultantInvoiceItem", "oModelDataPro", true);
                        this.byId("CI_id_ConsultantInvoiceDeatailTable").setMode("Delete");
                    } else {
                        this.commonFetchInvoiceData(this.decodedPath, this.decodedEmployeeID);
                        this.commonFetchInvoiceItems(this.decodedPath, this.decodedEmployeeID);
                        this.setVisibilityForEdit();
                    }
                    oComboBox.setSelectedKey("");
                     this.scrollToSection("CI_id_NavConsultantInvoicePage", "CI_id_FirstSection");
                },

                CI_CommonID: function() {
                const ids = ["CI_id_InDate", "CI_id_PaybyInv", "CI_id_InputInvoiceTo", "CI_id_InputInvoiceAddress", "CI_id_InputCompGSTNO",  "CI_id_ConsultantName", "CI_id_codeModel", "CI_id_InputMobile", "CI_id_InputConsultantAddress", "CI_id_InputGSTNO", "CI_id_InputBankName", "CI_id_InputAccountName", "CI_id_InputAccountNo", "CI_id_InputIFSCCode"]
                ids.forEach((id) => {
                    this.byId(id).setValueState("None");
               });
                },

                onFetchContractDetails: async function() {
                    try {
                        // Contract list
                        this.getBusyDialog(); // <-- Open custom BusyDialog
                        const contractData = await this.ajaxReadWithJQuery("EmployeeContract", {
                            Type: "Contract"
                        });
                        var jsonModel = new sap.ui.model.json.JSONModel({
                            contractDetails: contractData.data
                        });
                        this.getView().setModel(jsonModel, "contractModel");
                         this.closeBusyDialog(); // <-- Close custom BusyDialog
                    } catch (error) {
                         this.closeBusyDialog(); // <-- Close custom BusyDialog
                         MessageToast.show(error.message || error.responseText);
                    }
                },

                // Common function to fetch invoice data
                commonFetchInvoiceData:async function(invoiceNo, userId) {
                    const requestData = {InvoiceNo: invoiceNo, EmployeeID: userId};
                     this.getBusyDialog(); // <-- Open custom BusyDialog
                 await   this.ajaxReadWithJQuery("ConsultantInvoice", requestData).then(function(oData) {
                            this.InvoiceNo = oData.data;
                            this.EmployeeID = oData.data;
                            if (oData.data.length > 0) {
                                var invoiceData = oData.data[0];
                                invoiceData.CGST = parseFloat(invoiceData.CGST) || 0;
                                invoiceData.SGST = parseFloat(invoiceData.SGST) || 0;
                                invoiceData.IGST = parseFloat(invoiceData.IGST) || 0;

                                // Check if CGST and SGST are present
                                invoiceData.CGSTSelected = invoiceData.CGST && invoiceData.SGST ? true : false;
                                invoiceData.IGSTSelected = invoiceData.IGST ? true : false;

                                // Set visibility for CGST/SGST or IGST
                                invoiceData.CGSTVisible = invoiceData.CGST && invoiceData.SGST ? true : false;
                                invoiceData.SGSTVisible = invoiceData.SGST ? true : false;
                                invoiceData.IGSTVisible = invoiceData.IGST && (!invoiceData.CGST || !invoiceData.SGST) ? true : false;

                                if (invoiceData.GSTNO || invoiceData.GSTNO === "") {
                                    invoiceData.GSTValid = false;
                                }

                                // Set the model with the updated data
                                var oNavigationModel = new sap.ui.model.json.JSONModel(invoiceData);
                                this.getView().setModel(oNavigationModel, "ConsultantInvoiceModel");
                                this.getView().byId("CI_id_InputGSTNO").setEnabled(invoiceData.Currency === "INR");
                            }
                             this.closeBusyDialog(); // <-- Close custom BusyDialog
                        }.bind(this))
                        .catch(function(error) {
                             this.closeBusyDialog(); // <-- Close custom BusyDialog
                             MessageToast.show(error.message || error.responseText);
                        });
                },

                 // Common function to fetch invoice items
                commonFetchInvoiceItems: async function(invoiceNo, userId) {
                     this.getBusyDialog(); // <-- Open custom BusyDialog
                    const requestData = { InvoiceNo: invoiceNo, EmployeeID: userId };
                    await this.ajaxReadWithJQuery("ConsultantInvoiceItem", requestData)
                        .then(function(oData) {
                            this.processInvoiceItems(oData.data);
                        }.bind(this))
                        .catch(function(error) {
                             this.closeBusyDialog(); // <-- Close custom BusyDialog
                            MessageToast.show(error.message || error.responseText);
                        });
                },

               processInvoiceItems: function(items) {
                    try {
                        // Sort items
                        items.sort((a, b) => {
                            const valueA = a.Item || '';
                            const valueB = b.Item || '';
                            const isNumericA = !isNaN(valueA);
                            const isNumericB = !isNaN(valueB);

                            if (isNumericA && isNumericB) {
                                return parseFloat(valueA) - parseFloat(valueB);
                            } else if (isNumericA) {
                                return -1;
                            } else if (isNumericB) {
                                return 1;
                            } else {
                                return valueA.toUpperCase().localeCompare(valueB.toUpperCase());
                            }
                        });

                        // Add IndexNo
                        items.forEach((item, index) => {
                            item.IndexNo = index + 1;
                        });

                        var oInvoiceModel = this.getView().getModel("ConsultantInvoiceModel");
                        oInvoiceModel.setProperty("/ConsultantInvoiceItem", items);
                        this.byId("CI_id_ConsultantInvoiceDeatailTable").getBinding("items").refresh(true);

                    // Set GST values in oModelDataPro
                    var oModelDataPro = this.getView().getModel("oModelDataPro");
                    var cgst = parseFloat(items[0]?.CGST) || 0;
                    var sgst = parseFloat(items[0]?.SGST) || 0;
                    var igst = parseFloat(items[0]?.IGST) || 0;

                    oModelDataPro.setProperty("/CGST", cgst);
                    oModelDataPro.setProperty("/SGST", sgst);
                    oModelDataPro.setProperty("/IGST", igst);

                    oModelDataPro.setProperty("/CGSTVisible", cgst && sgst);
                    oModelDataPro.setProperty("/SGSTVisible", !!sgst);
                    oModelDataPro.setProperty("/IGSTVisible", igst && (!cgst || !sgst));

                    // Update total amount
                    this.CI_updateTotalAmount();

                    // Control column visibility based on GSTNO
                    var gstNo = oInvoiceModel.getProperty("/GSTNO");
                    var isGSTNOVisible = !!gstNo;
                    this.byId("CI_id_ConsultantInvoiceDeatailTable").getColumns()[2].setVisible(isGSTNOVisible);

                    // Show/hide GSTCalculation column
                    var allEmptyGST = items.every(item => !item.GSTCalculation || item.GSTCalculation.trim() === "");
                    this.byId("CI_id_GSTCalc").setVisible(!allEmptyGST);
                    } catch (error) {
                       MessageToast.show(error.message || error.responseText);
                    } finally {
                        // Always close BusyDialog
                        this.closeBusyDialog();
                    }
                },

              CI_onChangeContractDetails: function (oEvent) {
                    let sValue = oEvent.getSource().getValue().split(' - ');
                    let contractID = sValue[0];
                    let contractName = sValue[1];
                    let oMsgText = this.i18nModel.getText("selectContractNo");

                    // Use common confirmation dialog
                    this.showConfirmationDialog(
                        this.i18nModel.getText("confirmationTitle"), // Title like "Confirm"
                        oMsgText,                                    // Message body
                        function () {
                            // On Confirm
                            this.selectedContractID = contractID;
                            this.Copy = true;
                            this.readFunction("/ConsultantInvoice", "ConsultantInvoiceModel", true, contractID, contractName);
                            sap.m.MessageToast.show(this.i18nModel.getText("datadestroy"));
                        }.bind(this),
                        function () {
                        }.bind(this),
                        this.i18nModel.getText("ok"),     // OK button text (optional)
                        this.i18nModel.getText("cancel")  // Cancel button text (optional)
                    );
                },

                readFunction: function(entitySet, modelName, isCreate, contractID, contractName) {
                    this.onFetchContractDetails();
                    this.ajaxReadWithJQuery(entitySet, {}).then(function(oData) {
                        var oJSONModel = new sap.ui.model.json.JSONModel(oData);
                        this.getView().setModel(oJSONModel, modelName);

                        if (isCreate && modelName === "ConsultantInvoiceModel") {
                            if (!this.copiedData || Object.keys(this.copiedData).length === 0) {
                                this.copiedData = {};
                            }

                            var filters = [];
                            var loginData = this.getOwnerComponent().getModel("LoginModel").getData();

                            if (this.Copy !== true) {
                                filters.push(new sap.ui.model.Filter("EmployeeID", sap.ui.model.FilterOperator.EQ, loginData.userIds));
                                this.Copy = true;
                            } else if (this.selectedContractID) {
                                filters.push(new sap.ui.model.Filter("EmployeeID", sap.ui.model.FilterOperator.EQ, this.selectedContractID));
                            } else {
                                filters.push(new sap.ui.model.Filter("EmployeeID", sap.ui.model.FilterOperator.EQ, this.EmployeeID));
                                this.Copy = false;
                            }

                            var oInvoiceModel = this.getView().getModel("ConsultantInvoiceModel");

                            if (this.Copy === false && this.Copy !== undefined) {
                                oInvoiceModel.setProperty("/EmployeeID", this.EmployeeID);
                                oInvoiceModel.setProperty("/ConsultantName", this.ConsultantName);
                            } else if (contractID) {
                                oInvoiceModel.setProperty("/EmployeeID", contractID);
                                oInvoiceModel.setProperty("/ConsultantName", contractName);
                            } else {
                                oInvoiceModel.setProperty("/EmployeeID", loginData.EmployeeID);
                                oInvoiceModel.setProperty("/ConsultantName", loginData.EmployeeName);
                            }

                            var oToday = new Date();
                            oToday.setHours(0, 0, 0, 0); // Normalize

                            var oValidUntil = new Date(oToday);
                            oValidUntil.setDate(oValidUntil.getDate() + 30);

                            oInvoiceModel.setProperty("/InvoiceDate", oToday);
                            oInvoiceModel.setProperty("/PayBy", oValidUntil);
                            oInvoiceModel.setProperty("/GSTValid", false);
                            oInvoiceModel.setProperty("/Currency", "INR");
                            oInvoiceModel.setProperty("/STDCode", "+91");
                            this.getView().byId("CI_id_ColumnGST").setVisible(false);
                            this.getView().byId("CI_id_GSTCalc").setVisible(false);
                            this.getView().getModel("visiablityPlay").setProperty("/copyBtn", false);
                            this.getView().getModel("visiablityPlay").setProperty("/pasteBtn", false);

                            var currency = oInvoiceModel.getProperty("/Currency");
                            this.getView().byId("CI_id_InputGSTNO").setEnabled(currency === "INR");

                            this.CI_onPressPasteBtn();
                        }
                    }.bind(this)).catch(function(error) {
                       MessageToast.show(error.message || error.responseText);
                    });
                },

                setVisibilityForEdit: function() {
                    this.getView().getModel("visiablityPlay").setProperty("/editVisi", true);
                    this.getView().getModel("visiablityPlay").setProperty("/createVisi", false);
                    this.getView().getModel("visiablityPlay").setProperty("/editable", false);
                    this.byId("CI_id_ConsultantInvoiceDeatailTable").setMode("None");
                    this.getView().getModel("visiablityPlay").setProperty("/invBtn", false);
                    this.getView().getModel("visiablityPlay").setProperty("/copyBtn", true);
                    this.getView().getModel("visiablityPlay").setProperty("/pasteBtn", false);
                    this.getView().getModel("visiablityPlay").setProperty("/merge", true);
                },

                CI_onPressEdit: function() {
                    var isEditMode = this.getView().getModel("visiablityPlay").getProperty("/editable");
                    if (isEditMode) {
                        this.onPressUpdateInvoice();
                    } else {
                        this.getView().getModel("visiablityPlay").setProperty("/editable", true);
                        this.getView().getModel("visiablityPlay").setProperty("/invBtn", true);
                        this.getView().getModel("visiablityPlay").setProperty("/copyBtn", false);
                        this.getView().getModel("visiablityPlay").setProperty("/merge", false);
                        this.byId("CI_id_ConsultantInvoiceDeatailTable").setMode("Delete");
                        if (this.getView().getModel("ConsultantInvoiceModel").getData().GSTNO) {
                            this.getView().getModel("ConsultantInvoiceModel").setProperty("/GSTValid", true);
                        }
                    }
                },

               CI_onPressAddInvoiceDetails: function() {
                    var oModel = this.getView().getModel("ConsultantInvoiceModel");
                    var oData = oModel.getData();

                    if (!oData.ConsultantInvoiceItem) {
                        oData.ConsultantInvoiceItem = [];
                    }

                    var gstInput = this.byId("CI_id_InputGSTNO").getValue();
                    var GSTCalculationValue = gstInput ? "YES" : "NO";

                    var loginData = this.getOwnerComponent().getModel("LoginModel").getData();
                    var employeeID = loginData.EmployeeID;

                     var oVisibilityModel = this.getView().getModel("visiablityPlay");
                     var bEditMode = oVisibilityModel.getProperty("/editable");

                    var oNewInvoiceItem = {
                        IndexNo: oData.ConsultantInvoiceItem.length > 0
                            ? oData.ConsultantInvoiceItem[oData.ConsultantInvoiceItem.length - 1].IndexNo + 1
                            : 1,
                        SlNo: globalThis.crypto.randomUUID(),
                        EmployeeID: employeeID,
                        Item: "",
                        SAC: "",
                        GSTCalculation: GSTCalculationValue,
                        Days: "",
                        UnitPrice: "",
                        Total: "",
                        Currency: "INR"
                    };

                      // If in edit mode, add flag
                        if (bEditMode) {
                        oNewInvoiceItem.flag = "create";
                        }

                    oData.ConsultantInvoiceItem.push(oNewInvoiceItem);
                    oModel.setData(oData);
                    oModel.refresh(true);
                },

                CI_onInputChange: function(oEvent) {
                    var oInput = oEvent.getSource();
                    var sValue = oInput.getValue().trim();
                    var regex = /^[0-9]{1,10}(\.[0-9]{1,2})?$/;

                    if (sValue !== "") {
                        if (sValue.length > 10 || !regex.test(sValue)) {
                            oInput.setValueState("Error");
                            oInput.setValueStateText("Value must be up to 10 characters, with a maximum of 2 decimals.");
                            this.UnitAmount = false;
                        } else {
                            oInput.setValueState("None");
                            oInput.setValueStateText("");
                            this.UnitAmount = true;
                        }
                    } else {
                        oInput.setValueState("None");
                        oInput.setValueStateText("");
                        this.UnitAmount = true;
                    }

                    var oBindingContext = oEvent.getSource().getBindingContext("ConsultantInvoiceModel");
                    var oItemContext = oBindingContext.getObject();

                    var days = parseFloat(oItemContext.Days) || 0;
                    var unit = parseFloat(oItemContext.UnitPrice) || 0;
                    var discount = parseFloat(oItemContext.Discount) || 0;

                    var iTotal = days ? days * unit : unit;
                    iTotal = iTotal - discount;

                    oBindingContext.getModel().setProperty(oBindingContext.getPath() + "/Total", isNaN(iTotal) ? 0 : parseFloat(iTotal.toFixed(2)));

                    this.CI_updateTotalAmount();
                },

                CI_updateTotalAmount: function() {
                    var oModel = this.getView().getModel("oModelDataPro");
                    var oConsultantInvoiceModel = this.getView().getModel("ConsultantInvoiceModel");
                    var aItems = oConsultantInvoiceModel.getProperty("/ConsultantInvoiceItem") || [];

                    var subTotalTaxable = 0,
                        subTotalNonTaxable = 0;
                    var cgst = 0,
                        sgst = 0,
                        igst = 0,
                        totalSum = 0;

                    aItems.forEach(function(oItem) {
                        var iItemTotal = oItem.Days ?
                            parseFloat(oItem.Days) * parseFloat(oItem.UnitPrice || 0) :
                            parseFloat(oItem.UnitPrice || 0);

                        var iDiscount = oItem.Discount ? parseFloat(oItem.Discount) || 0 : 0;

                        if (typeof oItem.Discount === 'string' && oItem.Discount.trim().endsWith('%')) {
                            var percentage = iDiscount / 100;
                            var iUpdatedTotal = iItemTotal - (iItemTotal * percentage);
                            oItem.Total = iUpdatedTotal.toFixed(2);
                            oItem.Discount = (iItemTotal * percentage).toFixed(2); // Separate field for discount value
                        } else {
                            var iUpdatedTotal = iItemTotal - iDiscount;
                            oItem.Total = iUpdatedTotal.toFixed(2);
                        }

                        // Update subtotals
                        if (oItem.GSTCalculation === "YES") {
                            subTotalTaxable += parseFloat(oItem.Total);
                            oItem.SAC = "998314";
                        } else {
                            subTotalNonTaxable += parseFloat(oItem.Total);
                            oItem.SAC = "-";
                        }
                    });

                    oModel.setProperty("/SubTotal", parseFloat(subTotalTaxable.toFixed(2)));
                    oModel.setProperty("/SubTotalNotGST", parseFloat(subTotalNonTaxable.toFixed(2)));
                    var oData = oConsultantInvoiceModel.getData();
                    var cgstPercentage = oData.CGSTSelected ? parseFloat(oData.Percentage || 9) : 0;
                    var sgstPercentage = oData.CGSTSelected ? parseFloat(oData.Percentage || 9) : 0;
                    var igstPercentage = oData.IGSTSelected ? parseFloat(oData.Percentage || 18) : 0;

                    var cgst = 0,
                        sgst = 0,
                        igst = 0,
                        totalSum = 0;

                    if (oData.CGSTSelected) {
                        cgst = subTotalTaxable * (cgstPercentage / 100);
                        sgst = subTotalTaxable * (sgstPercentage / 100);
                        totalSum = subTotalTaxable + subTotalNonTaxable + cgst + sgst;
                        oModel.setProperty("/CGST", parseFloat(cgst.toFixed(2)));
                        oModel.setProperty("/SGST", parseFloat(sgst.toFixed(2)));
                        oModel.setProperty("/CGSTPercentage", cgstPercentage);
                        oModel.setProperty("/SGSTPercentage", sgstPercentage);
                    } else if (oData.IGSTSelected) {
                        igst = subTotalTaxable * (igstPercentage / 100);
                        totalSum = subTotalTaxable + subTotalNonTaxable + igst;
                        oModel.setProperty("/IGST", parseFloat(igst.toFixed(2)));
                        oModel.setProperty("/IGSTPercentage", igstPercentage);
                    } else {
                        totalSum = subTotalTaxable + subTotalNonTaxable
                        oModel.setProperty("/CGST", 0);
                        oModel.setProperty("/SGST", 0);
                        oModel.setProperty("/IGST", 0);
                        oModel.setProperty("/CGSTPercentage", 0);
                        oModel.setProperty("/SGSTPercentage", 0);
                        oModel.setProperty("/IGSTPercentage", 0);
                    }
                    oModel.setProperty("/TotalSum", parseFloat(totalSum.toFixed(2)));
                    oModel.refresh();
                },

                CI_onchangeDiscount: function(oEvent) {
                    var sValue = oEvent.getParameter("value").trim();
                    var regex = /^[0-9]+(\.[0-9]{1,2})?%?$/;
                    var oInput = oEvent.getSource();
                    sValue = sValue.replace(/[^0-9.%]/g, "");

                    var isPercentage = sValue.indexOf('%') !== -1;
                    if (isPercentage) {
                        sValue = sValue.replace('%', '');
                    }

                    var parts = sValue.split('.');
                    if (parts.length > 1) {
                        parts[1] = parts[1].substring(0, 2);
                        sValue = parts.join('.');
                    }

                    if (isPercentage) {
                        sValue = sValue + '%';
                    }
                    oInput.setValue(sValue);

                    if (!sValue) {
                        oInput.setValueState("None");
                        oInput.setValueStateText("");
                        this.CI_updateTotalAmount();
                        this.Discount = true;
                    } else if (!regex.test(sValue)) {
                        oInput.setValueState("Error");
                        oInput.setValueStateText(this.i18nModel.getText("discountValueText"));
                        this.Discount = false;
                    } else {
                        oInput.setValueState("None");
                        oInput.setValueStateText("");
                        this.CI_updateTotalAmount();
                        this.Discount = true;
                    }
                },

                CI_onChangeGSTCalculation: function() {
                    this.CI_updateTotalAmount();
                },

                CI_onPercentageChange: function(oEvent) {
                    var sPercentage = oEvent.getParameter("value");
                    var oModel = this.getView().getModel("ConsultantInvoiceModel");

                    oModel.setProperty("/Percentage", sPercentage);
                    this.CI_updateTotalAmount();
                },

                CI_onSelectCGST: function() {
                    this.getView().byId("CI_id_CheckboxIGST").setSelected(false);

                    var oModel = this.getView().getModel("oModelDataPro");
                    var oConsultantInvoiceModel = this.getView().getModel("ConsultantInvoiceModel");

                    oModel.setProperty("/CGSTSelected", true);
                    oModel.setProperty("/IGSTSelected", false);

                    oModel.setProperty("/CGSTVisible", true);
                    oModel.setProperty("/SGSTVisible", true);
                    oModel.setProperty("/IGSTVisible", false);

                    oConsultantInvoiceModel.setProperty("/CGSTVisible", true);
                    oConsultantInvoiceModel.setProperty("/SGSTVisible", true);
                    oConsultantInvoiceModel.setProperty("/IGSTVisible", false);

                    oConsultantInvoiceModel.setProperty("/Percentage", 9);
                    oConsultantInvoiceModel.setProperty("/CGSTSelected", true);

                    this.CI_updateTotalAmount();
                },

                CI_onSelectIGST: function() {
                    this.getView().byId("CI_id_CheckboxCGST").setSelected(false);

                    var oModel = this.getView().getModel("oModelDataPro");
                    var oConsultantInvoiceModel = this.getView().getModel("ConsultantInvoiceModel");

                    oModel.setProperty("/CGSTSelected", false);
                    oModel.setProperty("/IGSTSelected", true);

                    oModel.setProperty("/CGSTVisible", false);
                    oModel.setProperty("/SGSTVisible", false);
                    oModel.setProperty("/IGSTVisible", true);

                    oConsultantInvoiceModel.setProperty("/CGSTVisible", false);
                    oConsultantInvoiceModel.setProperty("/SGSTVisible", false);
                    oConsultantInvoiceModel.setProperty("/IGSTVisible", true);

                    oConsultantInvoiceModel.setProperty("/Percentage", 18);

                    this.CI_updateTotalAmount();
                },

              CI_onPressDelete: async function (oEvent) {
                    const oListItem = oEvent.getParameter("listItem");
                    const oContext = oListItem.getBindingContext("ConsultantInvoiceModel");
                    const oModel = this.getView().getModel("ConsultantInvoiceModel");

                    if (!oContext) {
                        sap.m.MessageToast.show("Context not found for selected item.");
                        return;
                    }

                    const oItemData = oContext.getObject();
                    const aItems = oModel.getProperty("/ConsultantInvoiceItem");

                    const confirmed = await new Promise((resolve) => {
                        this.showConfirmationDialog(
                            "Confirm Deletion",
                            "Are you sure you want to delete this selected invoice item?",
                            () => resolve(true),
                            () => resolve(false)
                        );
                    });

                    if (!confirmed) return;

                    this.getBusyDialog();

                    try {
                        const updatedItems = aItems.filter(item => item.IndexNo !== oItemData.IndexNo);

                        // Reindex the remaining items
                        updatedItems.forEach((item, idx) => {
                            item.IndexNo = idx + 1;
                        });

                        oModel.setProperty("/ConsultantInvoiceItem", updatedItems);

                        // Check if the item is already saved (existing in DB)
                        const isSavedItem = oItemData.InvoiceNo && oItemData.SlNo;

                       if (isSavedItem) {
                            const sUrl = "/ConsultantInvoiceItem";
                            const oPayload = {
                                filters: {
                                    InvoiceNo: oItemData.InvoiceNo,
                                    SlNo: oItemData.SlNo
                                }
                            };

                            await this.ajaxDeleteWithJQuery(sUrl, oPayload);
                            sap.m.MessageToast.show("Invoice item deleted successfully.");
                        } else {
                            sap.m.MessageToast.show("Draft invoice item removed.");
                        }

                        this.CI_updateTotalAmount();
                    } catch (error) {
                        sap.m.MessageToast.show(error.message || error.responseText);
                    } finally {
                        this.closeBusyDialog();
                    }
                },

                CI_onChangeGstNo: function(oEvent) {
                    this.getView().getModel("visiablityPlay").setProperty("/pasteBtn", false);
                    this.copiedData = {}; // Reset copied data
                    var gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{3}$/;
                    var data = gstRegex.test(this.byId("CI_id_InputGSTNO").getValue());
                    if (data) {
                        this.CI_onSelectCGST();
                    }
                },

                CI_onPressCopyBtn: function() {
                    this.Copy = true;
                    var oModel = this.getView().getModel("ConsultantInvoiceModel");
                    var oData = oModel.getProperty("/");

                    if (oData.InvoiceNo) {
                        this.copiedData = {
                            ConsultantName: oData.ConsultantName,
                            InvoiceTo: oData.InvoiceTo,
                            InvoiceAddress: oData.InvoiceAddress,
                            ConsultantAddress: oData.ConsultantAddress,
                            GSTNO: oData.GSTNO,
                            CompanyGSTNO: oData.CompanyGSTNO,
                            MobileNo: oData.MobileNo,
                            BankName: oData.BankName,
                            AccountName: oData.AccountName,
                            AccountNo: oData.AccountNo,
                            IFSCCode: oData.IFSCCode,
                            Currency: oData.Currency,
                            InvoiceDate: oData.InvoiceDate,
                            PayBy: oData.PayBy,
                        };

                        this.EmployeeID = oModel.getData().EmployeeID;
                        this.ConsultantName = oModel.getData().ConsultantName;
                        // Navigate to the specified route after copying
                        this.getRouter().navTo("RouteNavConsultantInvoiceApplication", {
                            sPath: "X",
                            oPath: "Y"
                        });
                    } else {
                        sap.m.MessageToast.show("No matching data found for the provided InvoiceNo and EmployeeID.");
                    }
                },

                CI_onPressPasteBtn: function() {
                    this.Copy = false
                    var oModel = this.getView().getModel("ConsultantInvoiceModel");

                    if (this.copiedData && Object.keys(this.copiedData).length > 0) {
                        if (oModel) {
                            // Paste copied data
                            Object.keys(this.copiedData).forEach(key => {
                                oModel.setProperty("/" + key, this.copiedData[key]);
                            });

                            // Validate GST Number and set column visibility
                            var gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{3}$/;
                            var isGSTValid = gstRegex.test(this.copiedData.GSTNO);

                            oModel.setProperty("/GSTValid", isGSTValid && this.copiedData.GSTNO.trim() !== "");

                            var oGSTColumn = this.byId("CI_id_ColumnGST");
                            oGSTColumn.setVisible(isGSTValid);

                            var oGSTCalColumn = this.byId("CI_id_GSTCalc");
                            oGSTCalColumn.setVisible(isGSTValid);

                            // Trigger currency validation
                            if (this.copiedData.Currency !== "INR") {
                                this.CI_onCurrencyChange(); // Trigger for non-INR currencies
                            } else {
                                this.CI_onChangeGstNo(); // Trigger GST validation for INR currency
                            }

                            // Show success message and hide the paste button
                            sap.m.MessageToast.show("Data pasted successfully!");

                            // Clear copied data
                            this.copiedData = {}; // Reset copied data

                            this.getView().getModel("visiablityPlay").setProperty("/pasteBtn", false);
                        }
                    }
                },

                CI_onCurrencyChange: function() {
                    var oConsultantModel = this.getView().getModel("ConsultantInvoiceModel");
                    var currency = oConsultantModel.getProperty("/Currency");

                    var oModelDataPro = this.getView().getModel("oModelDataPro");
                    var totalSum = parseFloat(oModelDataPro.getProperty("/TotalSum")) || 0;
                    var cgst = parseFloat(oModelDataPro.getProperty("/CGST")) || 0;
                    var sgst = parseFloat(oModelDataPro.getProperty("/SGST")) || 0;
                    var igst = parseFloat(oModelDataPro.getProperty("/IGST")) || 0;

                    var gstInputField = this.byId("CI_id_InputGSTNO");
                    var isGSTValid = utils._LCvalidateGstNumber({
                        getSource: () => gstInputField
                    });
                    oConsultantModel.setProperty("/GSTValid", isGSTValid && gstInputField !== "");
                    var gstValue = gstInputField.getValue().trim();

                     // Handle GST empty case
                    if (gstValue === "") {
                        gstInputField.setValueState("None");
                        oConsultantModel.setProperty("/GSTValid", false);
                    }

                    var oGSTColumn = this.byId("CI_id_ColumnGST");
                    var oGSTCalColumn = this.byId("CI_id_GSTCalc");

                    var isVisible = isGSTValid && gstInputField !== "" && currency === "INR";
                    oGSTColumn.setVisible(isVisible);
                    oGSTCalColumn.setVisible(isVisible);

                    if (currency !== "INR") {
                        var updatedTotalSum = totalSum;
                        var oData = oConsultantModel.getData();

                        if (oData.CGSTSelected) {
                            updatedTotalSum -= (cgst + sgst);
                        } else if (oData.IGSTSelected) {
                            updatedTotalSum -= igst;
                        }

                        oModelDataPro.setProperty("/SubTotalNotGST", updatedTotalSum.toFixed(2));
                        oModelDataPro.setProperty("/TotalSum", updatedTotalSum.toFixed(2));
                        oModelDataPro.setProperty("/SubTotal", "");

                        var gstProperties = ["/CGSTVisible", "/IGSTVisible", "/SGSTVisible", "/CGSTSelected", "/IGSTSelected"];
                        gstProperties.forEach(prop => {
                            oConsultantModel.setProperty(prop, false);
                            oModelDataPro.setProperty(prop, false);
                        });

                        oConsultantModel.setProperty("/Percentage", "");
                        oConsultantModel.setProperty("/GSTNO", "");
                        oConsultantModel.setProperty("/GSTValid", false);
                        this.getView().byId("CI_id_InputGSTNO").setEnabled(false);
                    } else {
                        gstInputField.setValueState("None");
                        this.getView().byId("CI_id_InputGSTNO").setEnabled(true);
                    }
                },

                CID_DateValidate: function (oEvent) {
                    var oView = this.getView();
                    var oDatePicker = oEvent.getSource();
                    var oDate = oDatePicker.getDateValue();

                    if (oDate) {
                    oDate.setHours(0, 0, 0, 0);

                    var oMaxDate = new Date(oDate);
                    oMaxDate.setDate(oMaxDate.getDate() + 30);

                    var oValidUntil = oView.byId("CI_id_PaybyInv");
                    oValidUntil.setMinDate(oDate);
                    oValidUntil.setMaxDate(oMaxDate);

                    var oCurrentValidUntil = oValidUntil.getDateValue();
                    if (!oCurrentValidUntil || oCurrentValidUntil < oDate || oCurrentValidUntil > oMaxDate) {
                        oValidUntil.setDateValue(oMaxDate); // Reset to max if invalid
                    }
                    }
                },

                CID_LastDate: function (oEvent) {
                    utils._LCvalidateDate(oEvent)
                },

                CID_ValidateConsultantGstNumber: function(oEvent) {
                    var oInput = oEvent.getSource ? oEvent.getSource() : this.byId("CI_id_InputGSTNO");

                    if (oInput.getValue() === "") {
                        oInput.setValueState("None");
                    }

                    var gstInputField = this.byId("CI_id_InputGSTNO");
                    var gstInput = gstInputField.getValue().trim();
                    var isGSTValid = utils._LCvalidateGstNumber({
                        getSource: () => gstInputField
                    });

                    var oConsultantModel = this.getView().getModel("ConsultantInvoiceModel");
                    oConsultantModel.setProperty("/GSTValid", isGSTValid && gstInput !== "");

                    var oGSTColumn = this.byId("CI_id_ColumnGST");
                    var oGSTCalColumn = this.byId("CI_id_GSTCalc");
                    var isVisible = isGSTValid && gstInput !== "";
                    oGSTColumn.setVisible(isVisible);
                    oGSTCalColumn.setVisible(isVisible);

                    var oModelDataPro = this.getView().getModel("oModelDataPro");
                    var totalSum = parseFloat(oModelDataPro.getProperty("/TotalSum")) || 0;
                    var cgst = parseFloat(oModelDataPro.getProperty("/CGST")) || 0;
                    var sgst = parseFloat(oModelDataPro.getProperty("/SGST")) || 0;
                    var igst = parseFloat(oModelDataPro.getProperty("/IGST")) || 0;

                    if (gstInput === "") {
                        var updatedTotalSum = totalSum;
                        var oData = oConsultantModel.getData();
                       
                        if (oData.CGSTSelected) {
                            updatedTotalSum -= (cgst + sgst);
                        } else if (oData.IGSTSelected) {
                            updatedTotalSum -= igst;
                        }

                        oModelDataPro.setProperty("/SubTotalNotGST", updatedTotalSum.toFixed(2));
                        oModelDataPro.setProperty("/TotalSum", updatedTotalSum.toFixed(2));
                        oModelDataPro.setProperty("/SubTotal", "");

                        ["CGSTVisible", "IGSTVisible", "SGSTVisible"].forEach(prop => {
                            oConsultantModel.setProperty(`/${prop}`, false);
                            oModelDataPro.setProperty(`/${prop}`, false);
                        });

                        oConsultantModel.setProperty("/Percentage", "");
                        ["CGSTSelected", "IGSTSelected"].forEach(prop => {
                            oConsultantModel.setProperty(`/${prop}`, false);
                            oModelDataPro.setProperty(`/${prop}`, false);
                        });
                    }
                },

                CID_ValidateGstNumber: function(oEvent) {
                   var oInput = oEvent.getSource();
                    utils._LCvalidateGstNumber(oEvent);
                     if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
                },

                CID_ValidateCommonFields: function(oEvent) {
                   var oInput = oEvent.getSource();
                    utils._LCvalidateMandatoryField(oEvent);
                      if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
                },

                CID_ValidateMobileNo: function(oEvent) {
                   var oInput = oEvent.getSource();
                    utils._LCvalidateMobileNumber(oEvent);
                      if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
                },

                CID_ValidateAccountNo: function(oEvent) {
                   var oInput = oEvent.getSource();
                    utils._LCvalidateAccountNo(oEvent);
                      if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
                },

                CID_ValidateIfscCode: function(oEvent) {
                   var oInput = oEvent.getSource();
                    utils._LCvalidateIfcCode(oEvent);
                      if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
                },

                CID_ValidateComboBox: function(oEvent) {
                   var oInput = oEvent.getSource();
                      utils._LCstrictValidationComboBox(oEvent);
                        if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
                },

               CI_onPressback: function () {
                    var isEditMode = this.getView().getModel("visiablityPlay").getProperty("/editable");
                    if (isEditMode) {
                        this.showConfirmationDialog(
                            this.i18nModel.getText("ConfirmActionTitle"),
                            this.i18nModel.getText("backConfirmation"),
                            function () {
                                // Reset edit-related flags
                                this.getView().getModel("visiablityPlay").setProperty("/editable", false);
                                this.getView().getModel("visiablityPlay").setProperty("/invBtn", false);
                                this.getView().getModel("visiablityPlay").setProperty("/copyBtn", true);
                                this.getView().getModel("visiablityPlay").setProperty("/merge", true);
                                
                                // Set table mode back to default (e.g., "None")
                                this.byId("CI_id_ConsultantInvoiceDeatailTable").setMode("None");

                                // Navigate back
                                this.getRouter().navTo("RouteConsultantInvoiceApplication");
                            }.bind(this)
                        );
                    } else {
                        this.getRouter().navTo("RouteConsultantInvoiceApplication");
                    }
                },

               CI_onPressSubmit: async function () {
                    try {
                        const that = this;
                         var isMandatoryValid = (
                            utils._LCvalidateDate(this.byId("CI_id_InDate"), "ID") &&
                            utils._LCvalidateDate(this.byId("CI_id_PaybyInv"), "ID") &&
                            utils._LCvalidateMandatoryField(this.byId("CI_id_InputInvoiceTo"), "ID") &&
                            utils._LCvalidateMandatoryField(this.byId("CI_id_InputInvoiceAddress"), "ID") &&
                            utils._LCvalidateMandatoryField(this.byId("CI_id_ConsultantName"), "ID") &&
                            utils._LCstrictValidationComboBox(this.byId("CI_id_codeModel"), "ID") &&
                            utils._LCvalidateMobileNumber(this.byId("CI_id_InputMobile"), "ID") &&
                            utils._LCvalidateMandatoryField(this.byId("CI_id_InputConsultantAddress"), "ID") &&
                            utils._LCvalidateMandatoryField(this.byId("CI_id_InputBankName"), "ID") &&
                            utils._LCvalidateMandatoryField(this.byId("CI_id_InputAccountName"), "ID") &&
                            utils._LCvalidateAccountNo(this.byId("CI_id_InputAccountNo"), "ID") &&
                            utils._LCvalidateIfcCode(this.byId("CI_id_InputIFSCCode"), "ID"));
                            if (!isMandatoryValid) {
                                MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                                return;
                            }
                        {
                            const invoiceModel = that.getView().getModel("ConsultantInvoiceModel");
                            const invoiceData = invoiceModel.getData();

                            const itemModel = that.getView().getModel("oModelDataPro");
                            const itemData = itemModel.getData();

                            var isValid = true;
                            if (invoiceData.GSTNO && !utils._LCvalidateGstNumber(this.byId("CI_id_InputGSTNO"), "ID")) 
                                isValid = false;

                            if (invoiceData.CompanyGSTNO && !utils._LCvalidateGstNumber(this.byId("CI_id_InputCompGSTNO"), "ID")) 
                                isValid = false;

                            if (!isValid) {
                                MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                                return;
                            }

                            if (!itemData.TotalSum || itemData.TotalSum <= 0) {
                                MessageToast.show("Please ensure that at least one item is filled!");
                                return;
                            }

                            if (invoiceData.GSTNO && invoiceData.Percentage && invoiceData.CGSTSelected && invoiceData.IGSTVisible) {
                                MessageToast.show("Checkbox and the percentage field are filled in before Submit");
                                return;
                            }

                            if (!this.Discount || !this.UnitAmount) {
                                MessageToast.show(that.i18nModel.getText("mandetoryFields"));
                                return;
                            }

                            // Clean up unnecessary fields
                            delete invoiceData.results;
                            delete invoiceData.GSTValid;
                            delete invoiceData.CGSTSelected;
                            delete invoiceData.IGSTSelected;
                            delete invoiceData.InvoiceItems;

                            const invoiceItemData = this.byId("CI_id_ConsultantInvoiceDeatailTable").getModel("ConsultantInvoiceModel")
                            .getData().ConsultantInvoiceItem;

                            // Format dates
                            const oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" });
                            const sInvoiceDate = oDateFormat.format(this.byId("CI_id_InDate").getDateValue());
                            const sPayByDate = oDateFormat.format(this.byId("CI_id_PaybyInv").getDateValue());

                            const cleanedInvoiceItems = Array.isArray(invoiceItemData)
                                ? invoiceItemData.map(item => {
                                    const cleanItem = { ...item };
                                    delete cleanItem.IndexNo;

                                    return {
                                        EmployeeID: invoiceData.EmployeeID,
                                        Item: cleanItem.Item,
                                        Days: cleanItem.Days,
                                        SAC: (invoiceData.GSTNO !== undefined && invoiceData.GSTNO !== "") ? (cleanItem.SAC || "") : "",
                                        GSTCalculation: (invoiceData.GSTNO !== undefined && invoiceData.GSTNO !== "") ? (cleanItem.GSTCalculation || "") : "",
                                        UnitPrice: parseFloat(cleanItem.UnitPrice),
                                        Discount: cleanItem.Discount === undefined ? "" : String(cleanItem.Discount),
                                        Total: parseFloat(cleanItem.Total),
                                        Currency: invoiceData.Currency,
                                    };
                                }) : [];

                            const consultantInvoicePayload = {
                                EmployeeID: invoiceData.EmployeeID,
                                ConsultantName: invoiceData.ConsultantName,
                                InvoiceTo: invoiceData.InvoiceTo,
                                InvoiceAddress: invoiceData.InvoiceAddress,
                                InvoiceDate: sInvoiceDate,
                                ConsultantAddress: invoiceData.ConsultantAddress,
                                GSTNO: invoiceData.GSTNO || "",
                                CompanyGSTNO: invoiceData.CompanyGSTNO || "",
                                MobileNo: invoiceData.MobileNo,
                                CGST: invoiceData.CGSTSelected === false ? 0.0 : parseFloat(itemData.CGST) || 0.0,
                                SGST: invoiceData.CGSTSelected === false ? 0.0 : parseFloat(itemData.SGST) || 0.0,
                                IGST: invoiceData.IGSTSelected === false ? 0.0 : parseFloat(itemData.IGST) || 0.0,
                                SubTotal: parseFloat(itemData.SubTotal) || 0,
                                SubTotalNotGST: parseFloat(itemData.SubTotalNotGST) || 0,
                                TotalSum: parseFloat(itemData.TotalSum) || 0,
                                BankName: invoiceData.BankName,
                                AccountName: invoiceData.AccountName,
                                AccountNo: invoiceData.AccountNo,
                                IFSCCode: invoiceData.IFSCCode,
                                PayBy: sPayByDate,
                                Currency: invoiceData.Currency,
                                Percentage: invoiceData.Percentage || "",
                                STDCode: invoiceData.STDCode || "",
                            };

                            const combinedPayload = {
                                data: consultantInvoicePayload,
                                Items: cleanedInvoiceItems
                            };

                            // Submit invoice
                            this.getBusyDialog();
                            try {
                                const response = await that.ajaxCreateWithJQuery("ConsultantInvoice", combinedPayload);
                                this.closeBusyDialog();

                                if (response.success === true) {
                                    invoiceModel.setProperty("/CGST", consultantInvoicePayload.CGST);
                                    invoiceModel.setProperty("/SGST", consultantInvoicePayload.SGST);
                                    invoiceModel.setProperty("/IGST", consultantInvoicePayload.IGST);
                                    invoiceModel.setProperty("/SubTotal", consultantInvoicePayload.SubTotal);
                                    invoiceModel.setProperty("/SubTotalNotGST", consultantInvoicePayload.SubTotalNotGST);
                                    invoiceModel.setProperty("/TotalSum", consultantInvoicePayload.TotalSum);
                                    invoiceData.InvoiceNo = response.InvoiceNo;
                                    var oDialog = new sap.m.Dialog({
                                        title: this.i18nModel.getText("success"),
                                        type: sap.m.DialogType.Message,
                                        state: sap.ui.core.ValueState.Success,
                                        content: new sap.m.Text({
                                            text: this.i18nModel.getText("invoiceCreatemsg")
                                        }),
                                        beginButton: new sap.m.Button({
                                            text: "OK",
                                            type: "Accept",
                                            press: function () {
                                                oDialog.close();
                                                that.getRouter().navTo("RouteConsultantInvoiceApplication");
                                            }
                                        }),
                                        endButton: new sap.m.Button({
                                            text: "Generate PDF",
                                            type: "Attention",
                                            press: function () {
                                                oDialog.close();
                                                that.CI_onPressGeneratePdf();
                                                that.getRouter().navTo("RouteConsultantInvoiceApplication");
                                            }
                                        }),
                                        afterClose: function () {
                                            oDialog.destroy();
                                        }
                                    });

                                    oDialog.open();
                                } else {
                                    MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                                }
                            } catch (error) {
                                this.closeBusyDialog();
                               MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                            }
                        } 
                    } catch (error) {
                        this.closeBusyDialog();
                        MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                    }
                },

               onPressUpdateInvoice: async function () {
                      var oView = this.getView();
                      var oConsultantInvoiceModel = oView.getModel("ConsultantInvoiceModel").getData();
                      var oModelDataPro = oView.getModel("oModelDataPro").getData();
                      var Currency = oConsultantInvoiceModel.Currency;

                         // Format dates
                        const oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" });
                        const sInvoiceDate = oDateFormat.format(this.byId("CI_id_InDate").getDateValue());
                        const sPayByDate = oDateFormat.format(this.byId("CI_id_PaybyInv").getDateValue());

                        var isMandatoryValid = (
                            utils._LCvalidateDate(this.byId("CI_id_InDate"), "ID") &&
                            utils._LCvalidateDate(this.byId("CI_id_PaybyInv"), "ID") &&
                            utils._LCvalidateMandatoryField(this.byId("CI_id_InputInvoiceTo"), "ID") &&
                            utils._LCvalidateMandatoryField(this.byId("CI_id_InputInvoiceAddress"), "ID") &&
                            utils._LCvalidateMandatoryField(this.byId("CI_id_ConsultantName"), "ID") &&
                            utils._LCstrictValidationComboBox(this.byId("CI_id_codeModel"), "ID") &&
                            utils._LCvalidateMobileNumber(this.byId("CI_id_InputMobile"), "ID") &&
                            utils._LCvalidateMandatoryField(this.byId("CI_id_InputConsultantAddress"), "ID") &&
                            utils._LCvalidateMandatoryField(this.byId("CI_id_InputBankName"), "ID") &&
                            utils._LCvalidateMandatoryField(this.byId("CI_id_InputAccountName"), "ID") &&
                            utils._LCvalidateAccountNo(this.byId("CI_id_InputAccountNo"), "ID") &&
                            utils._LCvalidateIfcCode(this.byId("CI_id_InputIFSCCode"), "ID"));
                            if (!isMandatoryValid) {
                                MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                                return;
                            }{
                          // TotalSum check
                          if (!oModelDataPro.TotalSum || oModelDataPro.TotalSum <= 0) {
                              MessageToast.show("Please ensure that at least one item is filled!");
                              return;
                          }

                          // GST Validation
                          if (oConsultantInvoiceModel.GSTNO && oConsultantInvoiceModel.GSTNO !== "") {
                              if (oConsultantInvoiceModel.Percentage && oConsultantInvoiceModel.Percentage !== "") {
                                  if (oConsultantInvoiceModel.CGSTSelected && oConsultantInvoiceModel.IGSTVisible) {
                                      MessageToast.show("Both CGST and IGST are selected. Please review your GST setup.");
                                      return;
                                  }
                              } else {
                                  MessageToast.show("GST percentage is required when GST No is provided.");
                                  return;
                              }
                          }

                           if (!this.Discount || !this.UnitAmount) {
                                MessageToast.show(that.i18nModel.getText("mandetoryFields"));
                                return;
                            }

                            var isValid = true;
                            if (oConsultantInvoiceModel.GSTNO && !utils._LCvalidateGstNumber(this.byId("CI_id_InputGSTNO"), "ID")) 
                                isValid = false;

                            if (oConsultantInvoiceModel.CompanyGSTNO && !utils._LCvalidateGstNumber(this.byId("CI_id_InputCompGSTNO"), "ID")) 
                                isValid = false;

                            if (!isValid) {
                                MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                                return;
                            }

                          // Prepare main invoice data payload
                          var data = {
                              InvoiceNo: oConsultantInvoiceModel.InvoiceNo,
                              EmployeeID: oConsultantInvoiceModel.EmployeeID,
                              ConsultantName: oConsultantInvoiceModel.ConsultantName,
                              InvoiceTo: oConsultantInvoiceModel.InvoiceTo,
                              InvoiceAddress: oConsultantInvoiceModel.InvoiceAddress,
                              InvoiceDate: sInvoiceDate,
                              ConsultantAddress: oConsultantInvoiceModel.ConsultantAddress,
                              GSTNO: oConsultantInvoiceModel.GSTNO,
                              CompanyGSTNO: oConsultantInvoiceModel.CompanyGSTNO,
                              MobileNo: oConsultantInvoiceModel.MobileNo.toString(),
                              CGST: oConsultantInvoiceModel.CGSTSelected === false ? 0 : parseFloat(oModelDataPro.CGST),
                              SGST: oConsultantInvoiceModel.CGSTSelected === false ? 0 : parseFloat(oModelDataPro.SGST),
                              IGST: oConsultantInvoiceModel.IGSTSelected === false ? 0 : parseFloat(oModelDataPro.IGST),
                              SubTotal: parseFloat(oModelDataPro.SubTotal) || 0,
                              SubTotalNotGST: parseFloat(oModelDataPro.SubTotalNotGST) || 0,
                              TotalSum: parseFloat(oModelDataPro.TotalSum) || 0,
                              BankName: oConsultantInvoiceModel.BankName,
                              AccountName: oConsultantInvoiceModel.AccountName,
                              AccountNo: oConsultantInvoiceModel.AccountNo.toString(),
                              IFSCCode: oConsultantInvoiceModel.IFSCCode,
                              PayBy: sPayByDate,
                              Percentage: oConsultantInvoiceModel.Percentage?.toString() || "0",
                              Currency: Currency,
                              STDCode: oConsultantInvoiceModel.STDCode || ""
                          };

                            const filters = {
                              InvoiceNo: oConsultantInvoiceModel.InvoiceNo,
                              EmployeeID: oConsultantInvoiceModel.EmployeeID
                            };

                            const aItemArray = oView.getModel("ConsultantInvoiceModel").getProperty("/ConsultantInvoiceItem") || [];

                            const Items = aItemArray.map((item) => {
                                const oFilters = {
                                InvoiceNo: oConsultantInvoiceModel.InvoiceNo,
                                SlNo: item.SlNo || ""
                                };

                                // Include flag if it's a new item
                                if (item.flag === "create") {
                                oFilters.flag = "create";
                                }

                                return {
                                data: {
                                    InvoiceNo: item.InvoiceNo || oConsultantInvoiceModel.InvoiceNo,
                                    SlNo: item.SlNo,
                                    EmployeeID: item.EmployeeID,
                                    Item: item.Item || "",
                                    SAC: (oConsultantInvoiceModel.GSTNO !== undefined && oConsultantInvoiceModel.GSTNO !== "") ? (item.SAC.toString() || "") : "",
                                    GSTCalculation: (oConsultantInvoiceModel.GSTNO !== undefined && oConsultantInvoiceModel.GSTNO !== "") ? (item.GSTCalculation || "") : "",
                                    Days: item.Days.toString(),
                                    UnitPrice: parseFloat(item.UnitPrice),
                                    Discount: item.Discount ? item.Discount.toString() : "",
                                    Total: parseFloat(item.Total),
                                    Currency: item.Currency || Currency,
                                },
                                filters: oFilters
                                };
                            });

                          const payload = {
                              data,
                              filters,
                              Items
                          };

                        this.getBusyDialog(); // <-- Open custom BusyDialog

                          try {
                              const response = await this.ajaxUpdateWithJQuery("ConsultantInvoice", payload);
                              if (response.success === true) {
                                 this.closeBusyDialog(); // <-- Close custom BusyDialog
                                  // Update model with final computed values
                                  var oModel = this.getView().getModel("ConsultantInvoiceModel");
                                  oModel.setProperty("/CGST", data.CGST);
                                  oModel.setProperty("/SGST", data.SGST);
                                  oModel.setProperty("/IGST", data.IGST);
                                  oModel.setProperty("/SubTotal", data.SubTotal);
                                  oModel.setProperty("/SubTotalNotGST", data.SubTotalNotGST);
                                  oModel.setProperty("/TotalSum", data.TotalSum);
                                  oModel.setProperty("/GSTValid", false);
                                  oModel.setProperty("/CGSTSelected", oConsultantInvoiceModel.CGSTSelected);
                                  oModel.setProperty("/IGSTSelected", oConsultantInvoiceModel.IGSTSelected);

                                  // Set view visibility and table mode
                                  var oVisiModel = this.getView().getModel("visiablityPlay");
                                  oVisiModel.setProperty("/editable", false);
                                  oVisiModel.setProperty("/invBtn", false);
                                  oVisiModel.setProperty("/copyBtn", true);
                                  oVisiModel.setProperty("/merge", true);
                                  this.byId("CI_id_ConsultantInvoiceDeatailTable").setMode("None");
                                  sap.m.MessageBox.success(this.i18nModel.getText("invoiceUpdateMsg"));
                              }
                          } catch (error) {
                               this.closeBusyDialog(); // <-- Close custom BusyDialog
                               MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                          }
                      }
                  },

                 CI_onChangeGSTCalculation: function () {
                    this.CI_updateTotalAmount();
                  },

                CI_commonOpenDialog: function(fragmentName) {
                if (!this.CI_oDialogMail) {
                    sap.ui.core.Fragment.load({
                        name: fragmentName,
                        controller: this,
                    }).then(function(CI_oDialogMail) {
                        this.CI_oDialogMail = CI_oDialogMail;
                        this.getView().addDependent(this.CI_oDialogMail);
                        this.CI_oDialogMail.open();
                    }.bind(this));
                } else {
                    this.CI_oDialogMail.open();
                }
            },
            CI_onSendEmail: function() {
                var oUploaderDataModel = new JSONModel({
                    isEmailValid: true,
                    ToEmail: "",
                    CCEmail: this.getView().getModel("CCMailModel").getData()[0].CCEmailId,
                    name: "",
                    mimeType: "",
                    content: "",
                    isFileUploaded: false,
                    button: false
                });
                this.getView().setModel(oUploaderDataModel, "UploaderData");
                this.CI_commonOpenDialog("sap.kt.com.minihrsolution.fragment.CommonMail");
                this.validateSendButton();
            },
            Mail_onPressClose: function() {
                this.CI_oDialogMail.destroy();
                this.CI_oDialogMail = null;
                // this.CI_oDialogMail.close();
            },
            Mail_onUpload: function(oEvent) {
                this.handleFileUpload(
                    oEvent,
                    this, // context
                    "UploaderData", // model name
                    "/attachments", // path to attachment array
                    "/name", // path to comma-separated file names
                    "/isFileUploaded", // boolean flag path
                    "uploadSuccessfull", // i18n success key
                    "fileAlreadyUploaded", // i18n duplicate key
                    "noFileSelected", // i18n no file selected
                    "fileReadError", // i18n file read error
                    () => this.validateSendButton()
                );
            },

            validateSendButton: function() {
                const sendBtn = sap.ui.getCore().byId("SendMail_Button");
                const emailField = sap.ui.getCore().byId("CCMail_TextArea");
                const uploaderModel = this.getView().getModel("UploaderData");
                if (!sendBtn || !emailField || !uploaderModel) {
                    return;
                }
                const isEmailValid = utils._LCvalidateEmail(emailField, "ID") === true;
                const isFileUploaded = uploaderModel.getProperty("/isFileUploaded") === true;

                sendBtn.setEnabled(isEmailValid && isFileUploaded);
            },

            Mail_onEmailChange: function() {
                this.validateSendButton(); // Reuse from BaseController
            },
            Mail_onSendEmail: function() {
                var oModel = this.getView().getModel("ConsultantInvoiceModel").getData();
                // Format date to DD/MM/YYYY
                        var oDate = new Date(oModel.InvoiceDate); // Ensure it's a Date object
                        var sFormattedDate = [
                        ("0" + oDate.getDate()).slice(-2),
                        ("0" + (oDate.getMonth() + 1)).slice(-2),
                        oDate.getFullYear()
                        ].join("/");
                var oPayload = {
                    "EmployeeID": oModel.EmployeeID,
                    "ConsultantName":oModel.ConsultantName,
                    "InvoiceNo":oModel.InvoiceNo,
                    "InvoiceDate":sFormattedDate,
                    "TotalSum":oModel.TotalSum,
                    "InvoiceTo":oModel.InvoiceTo,
                    "toEmailID": oModel.ContarctEmail,
                    "CC": sap.ui.getCore().byId("CCMail_TextArea").getValue(),
                    "attachments": this.getView().getModel("UploaderData").getProperty("/attachments"),
                };
                this.getBusyDialog();
                this.ajaxCreateWithJQuery("ConsultantInvoiceSendEmail", oPayload).then((oData) => {
                    MessageToast.show(this.i18nModel.getText("emailSuccess"));
                    this.closeBusyDialog();
                }).catch((error) => {
                    MessageToast.show(error.responseText);
                    this.closeBusyDialog();
                });
                this.closeBusyDialog();
                this.Mail_onPressClose();
            },
             
            CD_onDiscountInfoPress: function (oEvent) {
                if (!this._oPopover) {
                    this._oPopover = new sap.m.Popover({
                        contentWidth: "400px",
                        contentHeight: "auto",
                        showHeader: false,
                        placement: sap.m.PlacementType.Bottom,
                        content: [
                            new sap.m.VBox({
                                alignItems: "Center",
                                justifyContent: "Center",
                                width: "100%",
                                items: [
                                    new sap.m.Text({
                                        text: this.i18nModel.getText("discountInfoText"),
                                        wrapping: true
                                    })
                                ]
                            }).addStyleClass("customPopoverContent")
                        ]
                    });
                    this.getView().addDependent(this._oPopover);
                }
                this._oPopover.openBy(oEvent.getSource());
            },

          CI_onPressGeneratePdf: function () {
            const { jsPDF } = window.jspdf;
            const oView = this.getView();
            const oModel = oView.getModel("ConsultantInvoiceModel").getData();
            const oConsultantItemModel = oModel.ConsultantInvoiceItem || [];
            
            let currency = oModel.Currency === "INR" ? "Rupees" : oModel.Currency;
            let totalInWords = this.convertNumberToWords(oModel.TotalSum, currency);
            if (oModel.Currency !== "INR") {
                totalInWords = totalInWords
                    .replaceAll("Lakh", "Million")
                    .replaceAll("Crore", "Billion")
                    .replaceAll("Paise", "Cents")
                    .replaceAll("Rupees", "Dollars");
            }

            const showSAC = oModel.GSTNO !== undefined && oModel.GSTNO !== "";

            const margin = 15;
            const doc = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4"
            });

            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const usableWidth = pageWidth - 2 * margin;
            const headerMargin = 25.4;
            let currentY = headerMargin;

            doc.setFontSize(16);
            doc.setFont("times", "bold");
            let headerLabel = (oModel.GSTNO === undefined || oModel.GSTNO === "") ? "INVOICE" : "TAX-INVOICE";
            doc.text(headerLabel, pageWidth - 18, currentY, { align: "right" });

            currentY += 10;

            const detailsStartY = currentY;
            const rowHeight = 6.5;
            const columnWidths = [30, 30];
            doc.setFontSize(12);
            doc.setFont("times", "normal");
            const rightAlignX = pageWidth - 13.5 - columnWidths[0] - columnWidths[1];

            const detailsTable = [
                { label: 'Invoice No. :', value: oModel.InvoiceNo },
                { label: 'Date :', value: Formatter.formatDate(oModel.InvoiceDate) },
            ];

            detailsTable.forEach(row => {
                doc.setFont("times", "bold");
                doc.text(row.label, rightAlignX + columnWidths[0] - doc.getTextWidth(row.label), currentY + 5);
                doc.setFont("times", "normal");
                doc.text(row.value, rightAlignX + columnWidths[0] + 2, currentY + 5);
                currentY += rowHeight;
            });

            currentY = detailsStartY + 5;
            doc.setFont("times", "bold");
            doc.text("From,", margin, currentY);
            currentY = detailsStartY + 10;
            doc.setFontSize(12);
            doc.text(oModel.ConsultantName, margin, currentY);
            currentY += 5;

            const ConsultantAddressLines = doc.splitTextToSize(oModel.ConsultantAddress, usableWidth / 2 - 10);
            doc.setFont("times", "normal");
            doc.text(ConsultantAddressLines, margin, currentY);
            currentY += ConsultantAddressLines.length * 5;

            if (oModel.GSTNO !== undefined && oModel.GSTNO !== "") {
                doc.text(`GSTIN : ${oModel.GSTNO}`, margin, currentY);
                currentY += 5;
            }

            currentY += 5;
            doc.setFont("times", "bold");
            doc.text("To,", margin, currentY);
            currentY += 5;
            doc.text(oModel.InvoiceTo, margin, currentY);
            currentY += 5;

            const InvoiceAddressLines = doc.splitTextToSize(oModel.InvoiceAddress, usableWidth / 2 - 10);
            doc.setFont("times", "normal");
            doc.text(InvoiceAddressLines, margin, currentY);
            currentY += InvoiceAddressLines.length * 5;

            if (oModel.CompanyGSTNO !== undefined && oModel.CompanyGSTNO !== "") {
                doc.text(`GSTIN : ${oModel.CompanyGSTNO}`, margin, currentY);
                currentY += 2;
            }

            currentY += 5; // always add a little space before the next section

            const body = oConsultantItemModel.map((item, index) => {
                const row = [
                    index + 1,
                    item.Item,
                    item.Days || "-",
                    Formatter.fromatNumber(item.UnitPrice) || "-",
                    Formatter.fromatNumber(item.Discount) || "-",
                    Formatter.fromatNumber(item.Total)
                ];
                if (showSAC) row.splice(3, 0, item.SAC); // Insert SAC as 4th column if required
                return row;
            });

            const head = showSAC
                ? [['Sl.No.', 'Item Description', 'Days', 'SAC', 'Unit Price', 'Discount', 'Total']]
                : [['Sl.No.', 'Item Description', 'Days', 'Unit Price', 'Discount', 'Total']];

            doc.autoTable({
                startY: currentY,
                head: head,
                body: body,
                theme: 'grid',
                headStyles: { fillColor: [41, 128, 185] },
                styles: {font: "times", fontSize: 10, cellPadding: 3, lineWidth: 0.5, lineColor: [30, 30, 30] },
                columnStyles: {
                    0: { halign: 'center' },
                    1: { halign: 'center' },
                    ...(showSAC ? { 
                        2: { halign: 'center' }, 
                        3: { halign: 'center' }, 
                        4: { halign: 'right' }, 
                        5: { halign: 'right' }, 
                        6: { halign: 'right' } 
                    } : { 
                        2: { halign: 'center' }, 
                        3: { halign: 'right' }, 
                        4: { halign: 'right' }, 
                        5: { halign: 'right' } 
                    })
                },
                 didParseCell: function (data) {
                if (data.section === 'head') {
                // Adjust header alignment for numeric columns
                if (showSAC) {
                    if ([4, 5, 6].includes(data.column.index)) {
                    data.cell.styles.halign = 'right';
                    } else {
                    data.cell.styles.halign = 'center';
                    }
                } else {
                    if ([3, 4, 5].includes(data.column.index)) {
                    data.cell.styles.halign = 'right';
                    } else {
                    data.cell.styles.halign = 'center';
                    }
                }
                }
            }
            });
    
            currentY = doc.lastAutoTable.finalY + 10;

            if (currentY + 40 > pageHeight) {
                doc.addPage();
                currentY = 20;
            }

            // Create summary table body
            const summaryBody = [];

            // SubTotal Without GST
            if (oModel.SubTotalNotGST > 0) {
                summaryBody.push([
                    `Sub-Total ( Non-Taxable ) (${oModel.Currency})`,
                    Formatter.fromatNumber(oModel.SubTotalNotGST)
                ]);
            }

            // SubTotal With GST
            if (oModel.SubTotal > 0) {
                summaryBody.push([
                    `Sub-Total ( Taxable ) (${oModel.Currency})`,
                    Formatter.fromatNumber(oModel.SubTotal)
                ]);
            }

            // GST Breakdown
            if (oModel.Currency !== "USD") {
                const cgstValue = parseFloat(oModel.CGST) || 0;
                const sgstValue = parseFloat(oModel.SGST) || 0;
                const igstValue = parseFloat(oModel.IGST) || 0;

                if (cgstValue > 0 || sgstValue > 0) {
                    summaryBody.push([
                        `CGST (${oModel.Percentage}%)`,
                        Formatter.fromatNumber(cgstValue.toFixed(2))
                    ]);
                    summaryBody.push([
                        `SGST (${oModel.Percentage}%)`,
                        Formatter.fromatNumber(sgstValue.toFixed(2))
                    ]);
                } else if (igstValue > 0) {
                    summaryBody.push([
                        `IGST (${oModel.Percentage}%)`,
                        Formatter.fromatNumber(igstValue.toFixed(2))
                    ]);
                }
            }

            // Total row
            const totalRowIndex = summaryBody.length;
            summaryBody.push([
                `Total (${oModel.Currency})`,
                Formatter.fromatNumber(oModel.TotalSum)
            ]);

            doc.autoTable({
                startY: currentY,
                head: [],
                body: summaryBody,
                theme: 'plain',
                styles: {
                    font: "times",
                    fontSize: 10,
                    halign: "right",
                    cellPadding: 2
                },
                columnStyles: {
                    0: { halign: "right", cellWidth: 60 },
                    1: { halign: "right", cellWidth: 40 }
                },
                margin: { left: 96 },
                didParseCell: function (data) {
                    if (data.row.index === totalRowIndex) {
                        // Apply top border only for the total row (last row)
                        data.cell.styles.lineWidth = { top: 0.5, right: 0, bottom: 0, left: 0 };
                        data.cell.styles.lineColor = [0, 0, 0];
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
            });

            currentY = doc.lastAutoTable.finalY + 10;

            oModel.AmountInWords = totalInWords;
            doc.setFont("times", "bold");
            doc.text("Amount in Words:", 13, currentY);
            currentY += 5;
            doc.setFont("times", "normal");
            const amountHeight = doc.getTextDimensions(oModel.AmountInWords || "").h;
            doc.text(oModel.AmountInWords || "", 13, currentY, { maxWidth: 180 });
            currentY += amountHeight + 10;

            doc.setFont("times", "bold").setFontSize(11);
            doc.text("PAYMENT METHOD :", margin - 2, currentY);
            currentY += 5;

            const paymentDetails = [
                { label: "Bank Name", value: oModel.BankName },
                { label: "Account Name", value: oModel.AccountName },
                { label: "Account No", value: oModel.AccountNo },
                { label: "IFSC Code", value: oModel.IFSCCode },
                { label: "Pay By", value: Formatter.formatDate(oModel.PayBy) }
            ];

            paymentDetails.forEach(detail => {
                doc.setFont("times", "bold");
                const label = `${detail.label} :`;
                const labelWidth = doc.getTextWidth(label);
                doc.text(label, margin - 2, currentY);
                doc.setFont("times", "normal");
                doc.text(detail.value, margin + labelWidth, currentY);
                currentY += 5;
            });

            currentY += 10;
            doc.setFont("times", "bold").setFontSize(12);
            const forLabelText = "For : " + oModel.ConsultantName;
            const totalTextWidth = doc.getTextWidth(forLabelText);
            doc.text(forLabelText, rightAlignX - totalTextWidth + 55, currentY);
            currentY += 15;

            doc.setFont("times", "normal").setFontSize(11);
            doc.text("Thank you for your business!", margin - 2, currentY);

            doc.save(`${oModel.ConsultantName}-${oModel.InvoiceNo}-Invoice.pdf`);
        }
      }
    );
  }
);
