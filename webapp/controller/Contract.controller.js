sap.ui.define(
    [
        "./BaseController", // Import BaseController
        "../model/formatter", // Custom formatter functions
        "sap/ui/model/json/JSONModel", //json model
        "../utils/validation", // Import validation functions
        "sap/m/MessageToast", // Import MessageToast for displaying messages
    ],
    function(BaseController, Formatter, JSONModel, utils, MessageToast) {
        "use strict";
        return BaseController.extend(
            "sap.kt.com.minihrsolution.controller.Contract", {
                Formatter: Formatter,
                onInit: function() {
                    this.getRouter().getRoute("RouteContract").attachMatched(this._onRouteMatched, this);
                },
                _onRouteMatched: async function() {
                    var LoginFunction = await this.commonLoginFunction("Contract");
                    if (!LoginFunction) return;
                    this.byId("C_id_ActivateBtn").setEnabled(false);
                    this.byId("C_id_Renewbtn").setEnabled(false);
                    this.byId("C_id_Salary").removeSelections(true);
                    this.getBusyDialog(); // Show busy dialog
                    this.onClearAndSearch("C_id_FilterBar"); // Clear and search function
                    this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                    this.getView().getModel("LoginModel").setProperty("/HeaderName", this.i18nModel.getText("contractDetails"));
                    try {
                        this._fetchCommonData("ManageCustomer", "CreateCustomerModel");
                        this._fetchCommonData("Currency", "CurrencyModel");
                        this._fetchCommonData("PaymentTerms", "ContractpaymentModel");
                        this.readCallForContract("Initial");
                    } catch (error) {
                        sap.m.MessageToast.show(error.message || error.responseText);
                    } finally {
                        this.closeBusyDialog(); // Close after async call finishes
                    }
                },
                readCallForContract: async function(filter) {
                    this.getBusyDialog(); // <-- Open custom BusyDialog
                    await this.ajaxReadWithJQuery("Contract", filter).then((oData) => {
                        var contractData = Array.isArray(oData.data) ? oData.data : [oData.data];
                        this.getOwnerComponent().setModel(new JSONModel(contractData), "ContractModel");
                        if (filter === "Initial") {
                            var contractDetails = [...new Map(contractData.filter(item => item.ContractNo).map(item => [item.ContractNo.trim(), item])).values()];
                            this.getView().setModel(new JSONModel(contractDetails), "ContractModelInitial");
                        }
                        this.closeBusyDialog(); // <-- Close custom BusyDialog
                    }).catch((error) => {
                        sap.m.MessageToast.show(error.message || error.responseText);
                    }).finally(() => {
                        this.closeBusyDialog(); // <-- Close custom BusyDialog
                    });
                },
                onPressback: function() {
                    this.getRouter().navTo("RouteTilePage");
                },
                onLogout: function() {
                    this.CommonLogoutFunction(); // Navigate to login page
                },
                C_onPressAddContract: function(oEvent) {
                    var oParValue, sAgreementNo = "";
                    var isCreateMode = oEvent.getSource().getId().lastIndexOf("C_id_AddBtn") !== -1;
                    if (isCreateMode) { // Case: Add new contract
                        oParValue = "CreateContractFlag";
                        // Navigate only with sParContract (no AgreementNo during create)
                        this.getRouter().navTo("RouteContractDetails", {
                            sParContract: oParValue,
                            sID: sAgreementNo || null
                        });
                    } else {
                        // Case: Edit existing contract
                        var oContext = oEvent.getSource().getBindingContext("ContractModel");
                        var oData = oContext.getModel().getData()[oContext.getPath().split("/")[1]];
                        oParValue = oData.ContractNo;
                        sAgreementNo = oData.AgreementNo;
                        // Navigate with both ContractNo and AgreementNo
                        this.getRouter().navTo("RouteContractDetails", {
                            sParContract: oParValue,
                            sID: sAgreementNo
                        });
                    }
                },
                C_onClearFilters: function() {
                    const oView = this.getView();
                    const oFilterBar = oView.byId("C_id_FilterBar");
                    oFilterBar.getFilterGroupItems().forEach((item) => {
                        const oControl = item.getControl();
                        if (oControl instanceof sap.m.ComboBox || oControl instanceof sap.m.Select) {
                            oControl.setSelectedKey(""); // Clear selected key
                        } else if (oControl instanceof sap.m.Input) {
                            oControl.setValue(""); // Clear input value
                        } else if (oControl instanceof sap.m.DateRangeSelection) {
                            oControl.setDateValue(null); // Clear date value
                            oControl.setSecondDateValue(null); // Clear second date value
                        }
                    });
                },
                C_onSearch: async function() {
                    this.getBusyDialog(); // Show busy dialog
                    var aFilterItems = this.byId("C_id_FilterBar").getFilterGroupItems();
                    var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({
                        pattern: "yyyy-MM-dd"
                    });
                    var params = {};
                    aFilterItems.forEach(function(oItem) {
                        var oControl = oItem.getControl();
                        var sValue = oItem.getName();
                        if (oControl) {
                            if (sValue === "Year") {
                                var oAssignmentStartDate = oControl.getDateValue();
                                var oAssignmentEndDate = oControl.getSecondDateValue();
                                if (oAssignmentStartDate && oAssignmentEndDate) {
                                    params["AssignmentStartDate"] = oDateFormat.format(oAssignmentStartDate);
                                    params["AssignmentEndDate"] = oDateFormat.format(oAssignmentEndDate);
                                }
                            } else if (oControl.isA("sap.m.ComboBox")) {
                                var sControlId = oControl.getId();
                                if (sControlId.includes("idContractNoCombo")) {
                                    var selectedKey = oControl.getSelectedKey();
                                    if (selectedKey) {
                                        params[sValue] = selectedKey;
                                    }
                                } else {
                                    var sValueText = oControl.getValue();
                                    if (sValueText) {
                                        params[sValue] = sValueText;
                                    }
                                }
                            } else if (oControl.getValue && oControl.getValue()) {
                                params[sValue] = oControl.getValue();
                            }
                        }
                    });
                    try {
                        await this._fetchCommonData("Contract", "ContractModel", params);
                    } catch (error) {
                        sap.m.MessageToast.show(error.message || error.responseText);
                    } finally {
                        this.closeBusyDialog(); // Close busy dialog
                    }
                },

                CD_ValidateComboBox: function(oEvent) {
                    utils._LCstrictValidationComboBox(oEvent);
                },

                CD_validateMobileNo: function(oEvent) {
                    utils._LCvalidateMobileNumber(oEvent);
                },

                CD_validateAmount: function(oEvent) {
                    utils._LCvalidateAmount(oEvent);
                },

                CD_validateComments: function(oEvent) {
                    utils._LCvalidateMandatoryField(oEvent);
                },

                CD_validateDate: function(oEvent) {
                    var oStartDatePicker = sap.ui.getCore().byId("CR_id_AssignmentStartDate");
                    var oEndDatePicker = sap.ui.getCore().byId("CR_id_AssignmentEndDate");
                    const oSource = oEvent.getSource();
                    const sId = oSource.getId();
                    const sValue = oSource.getValue();
                    const oDate = this.onFormatDate(sValue); // Convert "dd/MM/yyyy" to Date object

                    if (!isNaN(oDate?.getTime?.())) {
                        if (sId === oStartDatePicker.getId()) {
                            oEndDatePicker.setMinDate(oDate); // Start Date changed — set minDate on End Date
                        } else if (sId === oEndDatePicker.getId()) {
                            oStartDatePicker.setMaxDate(oDate); // End Date changed — set maxDate on Start Date
                        }
                    }
                },

                // Format date string to Date object
                onFormatDate: function(dateString) {
                    var parts = dateString.split('/');
                    return new Date(parts[2], parts[1] - 1, parts[0]);
                },

                CU_onChangeAggrementDate: function() {
                    var oModelData = this.byId("C_id_Salary").getSelectedItem().getBindingContext("ContractModel").getObject();
                    this.AgreementDate = this.Formatter.formatDate(oModelData.AgreementDate);
                    this.AssignmentEndDate = this.Formatter.formatDate(oModelData.AssignmentEndDate);

                    const supdateAgreementDate = this.onFormatDate(this.AgreementDate);
                    if (supdateAgreementDate) {
                        sap.ui.getCore().byId("CR_id_AssignmentStartDate")?.setMinDate(supdateAgreementDate);
                    }

                    const supdateStartDate = this.onFormatDate(this.AssignmentEndDate);
                    if (supdateStartDate) {
                        sap.ui.getCore().byId("CR_id_AssignmentStartDate")?.setMaxDate(supdateStartDate);
                    }
                },

                formatDateToISO: function(dateObj) {
                    if (!dateObj || !(dateObj instanceof Date)) return "";
                    const year = dateObj.getFullYear();
                    const month = (dateObj.getMonth() + 1).toString().padStart(2, "0");
                    const day = dateObj.getDate().toString().padStart(2, "0");
                    return `${year}-${month}-${day}`; // YYYY-MM-DD
                },

                onShowMore: function(oEvent) {
                    var oBindingContext = oEvent.getSource().getBindingContext("ContractModel");
                    var sFullText = oBindingContext.getProperty("Comments");

                    var formattedReferenceData = `
                    <div style="padding: 15px; word-wrap: break-word; max-width: 100%; overflow-wrap: anywhere;">
                        <p>${sFullText}</p>
                    </div>`;

                    var oDialog = new sap.m.Dialog({
                        title: this.getView().getModel("i18n").getProperty("comments"),
                        draggable: true,
                        resizable: true,
                        contentWidth: "500px",
                        contentHeight: "auto",
                        content: new sap.ui.core.HTML({
                            content: formattedReferenceData
                        }),
                        beginButton: new sap.m.Button({
                            text: this.getView().getModel("i18n").getProperty("close"),
                            press: function() {
                                oDialog.close();
                            }
                        })
                    });
                    oDialog.open();
                },

                onSelectionChange: function(oEvent) {
                    var oSelectedItem = oEvent.getParameter("listItem");
                    var oActivateBtn = this.byId("C_id_ActivateBtn");
                    var oRenewBtn = this.byId("C_id_Renewbtn");

                    // Always disable both first
                    oActivateBtn.setEnabled(false);
                    oRenewBtn.setEnabled(false);

                    if (!oSelectedItem) return;

                    var oContext = oSelectedItem.getBindingContext("ContractModel");
                    var oData = oContext.getObject();
                    var sStatus = oData.ContractStatus;
                    var sEndDate = oData.AssignmentEndDate;

                    if (sStatus === "New") {
                        oActivateBtn.setEnabled(true);
                    }

                    if ((sStatus === "Active") && sEndDate) {
                        var endDate = this.Formatter.formatDate(sEndDate); // 'dd/mm/yyyy'
                        var endArr = endDate.split('/').map(Number);
                        var endDateObj = new Date(endArr[2], endArr[1] - 1, endArr[0]);
                        var today = new Date();

                        if (today >= endDateObj) {
                            oRenewBtn.setEnabled(true);
                        }
                    }

                    if (sStatus === "Inactive") {
                        oRenewBtn.setEnabled(true);
                    }
                },

                C_id_ActivatePress: function() {
                    var oView = this.getView();
                    // Set visibility flags
                    var oVisibleModel = new JSONModel({
                        showContractFields: true,
                        showMobileFields: true,
                        showComments: true,
                        showDateFields: false,
                        showAmountCurrencyFields: false
                    });
                    this.getView().setModel(oVisibleModel, "ContractFormVisibleModel");
                    var oTable = this.byId("C_id_Salary").getSelectedItem();
                    var oModelData = oTable.getBindingContext("ContractModel").getObject();
                    var ContractActivejson = {
                        ContractNo: oModelData.ContractNo,
                        AgreementNo: oModelData.AgreementNo,
                        STDCode: oModelData.STDCode,
                        MobileNo: oModelData.MobileNo,
                        Comments: oModelData.Comments,
                        ContractStatus: "New"
                    };
                    oView.setModel(new JSONModel(ContractActivejson), "ContractActiveModel");
                    this.openContractDialog(oView);
                },

                C_id_RenewPress: function() {
                    var oView = this.getView();
                    // Set visibility flags
                    var oVisibleModel = new JSONModel({
                        showContractFields: true,
                        showMobileFields: false,
                        showComments: true,
                        showDateFields: true,
                        showAmountCurrencyFields: true
                    });
                    this.getView().setModel(oVisibleModel, "ContractFormVisibleModel");
                    var oTable = this.byId("C_id_Salary").getSelectedItem();
                    var oModelData = oTable.getBindingContext("ContractModel").getObject();
                    var rateType = oModelData.ConsultantRate.split(" ")[3];
                    var varible = rateType === "Hr" ? 0 : rateType === "Day" ? 1 : 2;

                    var ContractActivejson = {
                        ContractNo: oModelData.ContractNo,
                        AgreementNo: oModelData.AgreementNo,
                        HrDaliyMonth: varible,
                        AssignmentStartDate: oModelData.AssignmentStartDate,
                        AssignmentEndDate: oModelData.AssignmentEndDate,
                        Amount: Number((oModelData.ConsultantRate.split(" ")[0]).replace(/,/g, '')),
                        Currency: oModelData.ConsultantRate.split(" ")[1],
                        Comments: oModelData.Comments,
                        ContractPeriod: oModelData.ContractPeriod,
                        ContractStatus: "Renewed"
                    };
                    oView.setModel(new JSONModel(ContractActivejson), "ContractActiveModel");
                    this.openContractDialog(oView);
                },

                openContractDialog: function(oView) {
                    if (!this.oContractDialog) {
                        // Load dialog fragment if not already loaded
                        sap.ui.core.Fragment.load({
                            name: "sap.kt.com.minihrsolution.fragment.ContractRenew",
                            controller: this,
                        }).then(function(oContractDialog) {
                            this.oContractDialog = oContractDialog;
                            oView.addDependent(this.oContractDialog);
                            this.CU_onChangeAggrementDate();
                            this.oContractDialog.open();
                        }.bind(this));
                    } else {
                        this.CU_onChangeAggrementDate();
                        this.oContractDialog.open();
                    }
                },

                CR_onPressClose: function() {
                    this.oContractDialog.close();
                    this.byId("C_id_ActivateBtn").setEnabled(false);
                    this.byId("C_id_Renewbtn").setEnabled(false);
                    this.byId("C_id_Salary").removeSelections(true);
                },


                CR_onPressSubmit: async function() {
                    var oView = this.getView();
                    var oContractFormVisible = oView.getModel("ContractFormVisibleModel").getData();
                    var oModel = oView.getModel("ContractActiveModel").getData();
                    if (oModel.ContractStatus === "Renewed") {
                            // Validate required fields for Renewed status
                            const isMandatoryValid = (
                                utils._LCvalidateDate(sap.ui.getCore().byId("CR_id_AssignmentStartDate"), "ID") &&
                                utils._LCvalidateAmount(sap.ui.getCore().byId("CR_id_EditAmountInput"), "ID") &&
                                utils._LCvalidateMandatoryField(sap.ui.getCore().byId("CR_id_Comments"), "ID")
                            );

                            if (!isMandatoryValid) {
                                this.closeBusyDialog();
                                MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                                return;
                            }

                            const rateType = oModel.HrDaliyMonth;
                            const rateText = rateType === 0 ? "Hr" : rateType === 1 ? "Day" : "Month";
                            const selectedCurrency = sap.ui.getCore().byId("CR_id_CurrencySelect").getSelectedKey();
                            const ConsultantRate = `${Formatter.fromatNumber(oModel.Amount)} ${selectedCurrency} Per ${rateText} Including all tax`;
                            const startDate = sap.ui.getCore().byId("CR_id_AssignmentStartDate").getDateValue();
                            const endDate = sap.ui.getCore().byId("CR_id_AssignmentEndDate").getDateValue();

                            try {
                                let jsonData = {
                                    ContractNo: oModel.ContractNo,
                                    AgreementNo: oModel.AgreementNo,
                                    StartDate: this.formatDateToISO(startDate),
                                    EndDate: this.formatDateToISO(endDate),
                                    ContractPeriod: oModel.ContractPeriod,
                                    ConsultantRate: ConsultantRate,
                                    Comments: oModel.Comments,
                                };

                                this.getBusyDialog();
                                var updateContract = await this.ajaxCreateWithJQuery("ContractStatusUpdate", jsonData);
                                if (updateContract.success) {
                                    MessageToast.show(this.i18nModel.getText("agreementUpdatedSuccess"));
                                    this.oContractDialog.close();
                                    this.byId("C_id_ActivateBtn").setEnabled(false);
                                    this.byId("C_id_Renewbtn").setEnabled(false);
                                    this.byId("C_id_Salary").removeSelections(true);
                                    return this.readCallForContract("Initial");
                                }
                            } catch (error) {
                                this.oContractDialog.close();
                                sap.m.MessageBox.error(this.i18nModel.getText("createNewContractFailed"));
                                this.closeBusyDialog();
                                return;
                            }
                        }

                    // Activation flow
                    if (oModel.ContractStatus === "New") {
                        if (oContractFormVisible.showMobileFields) {
                            const isValid = (
                                utils._LCstrictValidationComboBox(sap.ui.getCore().byId("CR_id_codeModel"), "ID") &&
                                utils._LCvalidateMobileNumber(sap.ui.getCore().byId("CR_id_Mobile"), "ID") &&
                                utils._LCvalidateMandatoryField(sap.ui.getCore().byId("CR_id_Comments"), "ID")
                            );

                            if (!isValid) {
                                this.closeBusyDialog();
                                MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                                return;
                            }
                        }

                        var oModelData = this.byId("C_id_Salary").getSelectedItem().getBindingContext("ContractModel").getObject();

                        try {
                            var jsonData = {
                                ContractNo: oModel.ContractNo,
                                AgreementNo: oModel.AgreementNo,
                                Comments: oModel.Comments,
                                ContractStatus: "Active",
                                ConsultantNameSalutation: oModelData.ConsultantNameSalutation,
                                ConsultantName: oModelData.ConsultantName,
                                ConsultingService: oModelData.ConsultingService,
                                ConsultantAddress: oModelData.ConsultantAddress,
                                EndClient: oModelData.EndClient,
                                LocationService: oModelData.LocationService,
                                AssignmentStartDate: oModelData.AssignmentStartDate,
                                AssignmentEndDate: oModelData.AssignmentEndDate,
                                ConsultantRate: oModelData.ConsultantRate,
                                PaymentTerms: oModelData.PaymentTerms,
                                ClientReportContactSalutation: oModelData.ClientReportContactSalutation,
                                ClientReportContact: oModelData.ClientReportContact,
                                SpecificInsuranceRequirement: oModelData.SpecificInsuranceRequirement,
                                ContractPeriod: oModelData.ContractPeriod,
                                ExpensesClaim: oModelData.ExpensesClaim,
                                AgreementDate: oModelData.AgreementDate,
                                ContarctEmail: oModelData.ContarctEmail,
                                ContractLocation: oModelData.ContractLocation,
                                BranchCode: oModelData.BranchCode,
                                Country: oModelData.Country,
                            };

                            if (oContractFormVisible.showMobileFields) {
                                jsonData.MobileNo = oModel.MobileNo;
                                jsonData.STDCode = oModel.STDCode;
                            }

                            const requestData = {
                                filters: {
                                    ContractNo: oModel.ContractNo,
                                    AgreementNo: oModel.AgreementNo
                                },
                                data: jsonData
                            };

                            this.getBusyDialog();
                            var updateResponse = await this.ajaxUpdateWithJQuery("Contract", requestData);
                            if (updateResponse.success) {
                                MessageToast.show(this.i18nModel.getText("agreementUpdatedSuccess"));
                                this.oContractDialog.close();
                                this.byId("C_id_ActivateBtn").setEnabled(false);
                                this.byId("C_id_Renewbtn").setEnabled(false);
                                this.byId("C_id_Salary").removeSelections(true);
                                return this.readCallForContract("Initial");
                            }
                        } catch (error) {
                            this.oContractDialog.close();
                            this.closeBusyDialog();
                            MessageToast.show(this.i18nModel.getText("updateContractFailed"));
                        }
                    }
                    this.closeBusyDialog();
                }
            }
        );
    }
);