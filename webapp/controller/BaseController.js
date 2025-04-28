sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "../utils/TraineeCertificatePDF",
  "../model/formatter"
], function (Controller, JSONModel, jsPDF, Formatter) {
  "use strict";

  return Controller.extend("sap.kt.ktofferletter.products.controller.BaseController", {
    Formatter: Formatter,
    // Router Code 
    getRouter: function () {
      return sap.ui.core.UIComponent.getRouterFor(this);
    },


    getI18nText: function (sKey, aParams) {
      const oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
      return oResourceBundle.getText(sKey, aParams);
    },

    calculateDateDifference: function (endDate, sStatus) {
      var thresholdDays = 30;
      if (!endDate) return "None";
      var parts = endDate.split('/');
      var day = parseInt(parts[0], 10);
      var month = parseInt(parts[1], 10) - 1;
      var year = parseInt(parts[2], 10);

      var endDateObj = new Date(year, month, day);

      var now = new Date();

      var timeDiff = endDateObj - now;
      var daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

      if (daysDiff <= thresholdDays && sStatus === "Active") {
        return "Indication03";
      } else {
        return;
      }
    },

    CommonLogoutFunction: function () {
      var oLoginModel = this.getOwnerComponent().getModel("LoginModel");
      if (oLoginModel) {
        oLoginModel.setProperty("/EmployeeID", "");
        oLoginModel.setProperty("/EmployeeName", "");
      }
      this.getRouter().navTo("RouteLoginPage");
    },

    commonLoginFunction: function (value) {
      var oModel = this.getOwnerComponent().getModel("LoginModel");
      var TileModel = this.getView().getModel("AppVisibilityModel");
      if (value && TileModel) {
        if (value === "EmployeeOffer" && TileModel.getProperty("/GenerateEmployeeOffer") === '0') {
          this.getRouter().navTo("RouteLoginPage");
        } else if (value === "Contract" && TileModel.getProperty("/GenerateContract") === '0') {
          this.getRouter().navTo("RouteLoginPage");
        } else if (value === "MSA&SOW" && TileModel.getProperty("/GenerateMsaNda") === '0') {
          this.getRouter().navTo("RouteLoginPage");
        } else if (value === "Trainee" && TileModel.getProperty("/GenerateTraineeOffer") === '0') {
          this.getRouter().navTo("RouteLoginPage");
        } else if (value === "Holiday" && TileModel.getProperty("/ListOfHolidays") === '0') {
          this.getRouter().navTo("RouteLoginPage");
        } else if (value === "ApplyLeave" && TileModel.getProperty("/ApplyLeave") === '0') {
          this.getRouter().navTo("RouteLoginPage");
        } else if (value === "MyInbox" && TileModel.getProperty("/MyInbox") === '0') {
          this.getRouter().navTo("RouteLoginPage");
        } else if (value === "Expense" && TileModel.getProperty("/ExpenseApp") === '0') {
          this.getRouter().navTo("RouteLoginPage");
        } else if (value === "CompanyInvoice" && TileModel.getProperty("/InvoiceApp") === '0') {
          this.getRouter().navTo("RouteLoginPage");
        } else if (value === "SelfService" && TileModel.getProperty("/SelfService") === '0') {
          this.getRouter().navTo("RouteLoginPage");
        } else if (value === "Customer" && TileModel.getProperty("/AddCustomer") === '0') {
          this.getRouter().navTo("RouteLoginPage");
        } else if (value === "IDCard" && TileModel.getProperty("/IDCard") === '0') {
          this.getRouter().navTo("RouteLoginPage");
        } else if (value === "ConsultantInvoice" && TileModel.getProperty("/ConsultantInvoice") === '0') {
          this.getRouter().navTo("RouteLoginPage");
        } else if (value === "EmployeeDetails" && TileModel.getProperty("/EmployeeDetail") === '0') {
          this.getRouter().navTo("RouteLoginPage");
        } else if (value === "Quotation" && TileModel.getProperty("/QuotationApp") === '0') {
          this.getRouter().navTo("RouteLoginPage");
        } else if (value === "AssigmentTask" && TileModel.getProperty("/AssignmentTask") === '0') {
          this.getRouter().navTo("RouteLoginPage");
        } else if (value === "AssigmentTask" && TileModel.getProperty("/AssignmentTask") === '0') {
          this.getRouter().navTo("RouteLoginPage");
        } else if (value === "PaySlip" && TileModel.getProperty("/PaySlip") === '0') {
          this.getRouter().navTo("RouteLoginPage");
        } else if (value === "Timesheet" && TileModel.getProperty("/Timesheet") === '0') {
          this.getRouter().navTo("RouteLoginPage");
        } else if (value === "TimeSheetApproval" && TileModel.getProperty("/TimeSheetApproval") === '0') {
          this.getRouter().navTo("RouteLoginPage");
        } else if (value === "SchemeUpload" && TileModel.getProperty("/SchemeUpload") === '0') {
          this.getRouter().navTo("RouteLoginPage");
        } else if (value === "IncomeAsset" && TileModel.getProperty("/IncomeAsset") === '0') {
          this.getRouter().navTo("RouteLoginPage");
        } else if (value === "AssetAssignment" && TileModel.getProperty("/AssetAssignment") === '0') {
          this.getRouter().navTo("RouteLoginPage");
        } else if (value === "A_Quotations" && TileModel.getProperty("/A_Quotations") === '0') {
          this.getRouter().navTo("RouteLoginPage");
        } else if (value === "A_Payroll" && TileModel.getProperty("/A_Payroll") === '0') {
          this.getRouter().navTo("RouteLoginPage");
        }
      }

      if (!oModel) {
        this.getRouter().navTo("RouteLoginPage");
        return;
      }
      var userId = oModel.getProperty("/EmployeeID");
      var userName = oModel.getProperty("/EmployeeName");
      if (!userId || !userName) {
        this.getRouter().navTo("RouteLoginPage");
        return;
      }
    },

    _fetchCommonData: async function (entityName, modelName, filter = "") {
      let url = this.getOwnerComponent().getModel("LoginModel").getData().url + entityName;
      try {
        await new Promise((resolve, reject) => {
          $.ajax({
            url: url,
            method: "GET",
            headers: this.getOwnerComponent().getModel("LoginModel").getData().headers,
            data: filter,
            success: function (data) {
              if (data) {
                var oModel = new JSONModel(data.data);
                this.getOwnerComponent().setModel(oModel, modelName);
              }
              resolve(data);
            }.bind(this),
            error: function (err) {
              reject(err);
            }
          });
        });

      } catch (error) {
        sap.m.MessageToast.show(error.responseJSON?.message || "Technical error, please contact the administrator");
      }
    },

    //Common read call for all the app
    async ajaxReadWithJQuery(sUrl, filter) {
      const queryString = new URLSearchParams(filter).toString();
      return new Promise((resolve, reject) => {
        $.ajax({
          url: this.getView().getModel("LoginModel").getData().url + sUrl + "?" + queryString,
          method: "GET",
          headers: this.getView().getModel("LoginModel").getData().headers,
          success: (data) => {
            resolve(data);
          },
          error: (error) => {
            reject(error);
          }
        });
      });
    },
    //Common create call for all the app
    async ajaxCreateWithJQuery(sUrl, oPayLoad) {
      return new Promise((resolve, reject) => {
        $.ajax({
          url: this.getView().getModel("LoginModel").getData().url + sUrl,
          method: "POST",
          data: JSON.stringify(oPayLoad),
          headers: this.getView().getModel("LoginModel").getData().headers,
          success: function (data) {
            resolve(data);
          },
          error: function (error) {
            reject(error);
          }
        });
      });
    },
    //Common update call for all the app
    async ajaxUpdateWithJQuery(sUrl, oPayLoad) {
      return new Promise((resolve, reject) => {
        $.ajax({
          url: this.getView().getModel("LoginModel").getData().url + sUrl,
          method: "PUT",
          data: JSON.stringify(oPayLoad),
          headers: this.getView().getModel("LoginModel").getData().headers,
          success: function (data) {
            resolve(data);
          },
          error: function (error) {
            reject(error);
          }
        });
      });
    },
    //Common delete call for all the app
    async ajaxDeleteWithJQuery(sUrl, oPayLoad) {
      sap.ui.core.BusyIndicator.show();
      return new Promise((resolve, reject) => {
        $.ajax({
          url: this.getView().getModel("LoginModel").getData().url + sUrl,
          method: "DELETE",
          contentType: "application/json",
          dataType: "json",
          data: JSON.stringify(oPayLoad),
          headers: this.getView().getModel("LoginModel").getData().headers,
          success: function (data) {
            sap.ui.core.BusyIndicator.hide();
            resolve(data);
          },
          error: function (error) {
            sap.ui.core.BusyIndicator.hide();
            reject(error);
          }
        });
      });
    },

    _calculateSalaryComponents: function (isTDSIncluded) {
      var oModel = this.getView().getModel("employeeModel");

      // Convert and fetch values
      var CTC = parseFloat(oModel.getProperty("/CTC").replaceAll(",", ""));
      var VariableData = parseFloat(oModel.getProperty("/VariablePercentage"));
      var joiningBonus = parseFloat(oModel.getProperty("/JoiningBonus").replaceAll(",", ""));
      var VariablePay = CTC * VariableData / 100;

      var BasicSalary, HRA, EmployeerPF, MedicalInsurance, Gratuity, SpecailAllowance, Total;
      var DeductionPF, IncomeTax_TDS, DeductionTotal, GrossPay;

      if (isTDSIncluded === "TDS") {
        BasicSalary = CTC * 40 / 100;
        HRA = BasicSalary * 40 / 100;
        EmployeerPF = 0;
        MedicalInsurance = BasicSalary * 40 / 100;
        Gratuity = BasicSalary * 4.81 / 100;
        SpecailAllowance = CTC - (BasicSalary + HRA + EmployeerPF + MedicalInsurance + Gratuity);
        Total = BasicSalary + HRA + MedicalInsurance + EmployeerPF + Gratuity + SpecailAllowance;

        DeductionPF = 0;
        IncomeTax_TDS = CTC * 10 / 100;
        DeductionTotal = DeductionPF + 2400 + IncomeTax_TDS;
        GrossPay = (Total - DeductionTotal);

      } else {
        var newCTC = CTC - VariablePay;
        BasicSalary = newCTC * 40 / 100;
        HRA = BasicSalary * 40 / 100;
        EmployeerPF = BasicSalary * 13 / 100;
        MedicalInsurance = BasicSalary * 40 / 100;
        Gratuity = BasicSalary * 4.81 / 100;
        SpecailAllowance = newCTC - (BasicSalary + HRA + EmployeerPF + MedicalInsurance + Gratuity);
        Total = BasicSalary + HRA + EmployeerPF + MedicalInsurance + Gratuity + SpecailAllowance;

        DeductionPF = BasicSalary * 12 / 100;
        IncomeTax_TDS = CTC * 10 / 100;
        DeductionTotal = DeductionPF + 2400 + IncomeTax_TDS;
        GrossPay = (Total - DeductionTotal);
      }
      var CostToCompany = GrossPay + DeductionTotal + VariablePay;
      // Set model properties
      oModel.setProperty("/BasicSalary", Math.round(BasicSalary));
      oModel.setProperty("/HRA", Math.round(HRA));
      oModel.setProperty("/EmployerPF", Math.round(EmployeerPF));
      oModel.setProperty("/MedicalInsurance", Math.round(MedicalInsurance));
      oModel.setProperty("/Gratuity", Math.round(Gratuity));
      oModel.setProperty("/SpecailAllowance", Math.round(SpecailAllowance));
      oModel.setProperty("/Total", Math.round(Total));

      oModel.setProperty("/EmployeePF", Math.round(DeductionPF));
      oModel.setProperty("/PT", Math.round(2400));
      oModel.setProperty("/IncomeTax", Math.round(IncomeTax_TDS));
      oModel.setProperty("/TotalDeduction", Math.round(DeductionTotal));
      oModel.setProperty("/GrossPay", Math.round(GrossPay));
      oModel.setProperty("/GrossPayMontly", Math.round(GrossPay * 12 / 100));

      oModel.setProperty("/VariablePay", Math.round(VariablePay));
      oModel.setProperty("/CostofCompany", Math.round(CostToCompany));
    },

    //Date picker common function 
    _makeDatePickersReadOnly: function (aIds) {
      var oView = this.getView();
      aIds.forEach(function (sId) {
        var oControl = oView.byId(sId);
        if (oControl) {
          var bIsValueHelp = oControl.getMetadata().getName() === "sap.m.Input" && oControl.getShowValueHelp && oControl.getShowValueHelp();

          oControl.addEventDelegate({
            onAfterRendering: function () {
              var oDomRef = oControl.getDomRef("inner");
              if (oDomRef) {
                oDomRef.setAttribute("readonly", true); // block typing
                oDomRef.style.cursor = "pointer";
              }
            }
          }, oControl);

          oControl.attachBrowserEvent("click", function () {
            var oIcon = oControl.getDomRef("icon");
            if (oIcon) {
              oIcon.click(); // open calendar or value help
            }
          });

          // Optional: prevent typing via keypress too (extra safe)
          oControl.attachBrowserEvent("keydown", function (oEvent) {
            oEvent.preventDefault();
          });
        }
      });
    },

    //fragment date picker function
    _FragmentDatePickersReadOnly: function (aIds) {
      aIds.forEach(function (sId) {
        var oDatePicker = sap.ui.getCore().byId(sId);
        if (oDatePicker) {
          oDatePicker.addEventDelegate({
            onAfterRendering: function () {
              var oInputDom = oDatePicker.getDomRef("inner");
              if (oInputDom) {
                oInputDom.setAttribute("readonly", true); // Prevent typing
                oInputDom.style.cursor = "pointer";
              }
            }
          }, oDatePicker);
          // Open calendar on click
          oDatePicker.attachBrowserEvent("click", function () {
            var oIconDomRef = oDatePicker.getDomRef("icon");
            if (oIconDomRef) {
              oIconDomRef.click(); // simulate icon click to open calendar
            }
          });
        }
      });
    },

    _convertBLOBtoBASE64: function (buffer) {
      if (!buffer || buffer.byteLength === 0) {
        console.error("Invalid BLOB data.");
        return "";
      }

      var binary = '';
      var bytes = new Uint8Array(buffer);

      for (var i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }

      return btoa(binary); // Convert binary string to Base64
    },

    handleFileUpload: function (
      oEvent,
      oContext,
      sModelName,
      sAttachmentPath,
      sNamePath,
      sUploadFlagPath,
      sSuccessTextKey,
      sDuplicateTextKey,
      sNoFileKey,
      sErrorKey,
      fnValidateCallback
    ) {
      var that = this;
      const oFileUploader = oEvent.getSource();
      const oFiles = oFileUploader.oFileUpload.files;
      const oModel = oContext.getView().getModel(sModelName);

      // No file selected
      if (!oFiles.length) {
        sap.m.MessageToast.show(oContext.getI18nText(sNoFileKey));
        return;
      }

      let attachments = oModel.getProperty(sAttachmentPath) || [];
      let uploadedFileNames = oModel.getProperty(sNamePath)
        ? oModel.getProperty(sNamePath).split(", ")
        : [];

      Array.from(oFiles).forEach((oFile) => {
        if (uploadedFileNames.includes(oFile.name)) {
          sap.m.MessageToast.show(oContext.getI18nText(sDuplicateTextKey, [oFile.name]));
          return;
        }

        const oReader = new FileReader();

        oReader.onload = (e) => {
          const sFileBinary = e.target.result.split(",")[1];

          attachments.push({
            filename: oFile.name,
            contentType: oFile.type,
            content: sFileBinary,
            encoding: "base64"
          });

          oModel.setProperty(sAttachmentPath, attachments);
          oModel.setProperty(sUploadFlagPath, true);

          uploadedFileNames.push(oFile.name);
          oModel.setProperty(sNamePath, uploadedFileNames.join(", "));

          sap.m.MessageToast.show(oContext.getI18nText(sSuccessTextKey, [oFile.name]));

          // Re-validate button
          if (typeof fnValidateCallback === "function") {
            fnValidateCallback.call(oContext);
          }
        };

        oReader.onerror = () => {
          sap.m.MessageToast.show(oContext.getI18nText(sErrorKey, [oFile.name]));
        };

        oReader.readAsDataURL(oFile);
      });

      // Clear uploader for next selection
      oFileUploader.setValue("");
    },

    async generateCertificatePDF(content, branchCode) {
      var oModel = this.getView().getModel("PDFData").getData();
      sap.ui.core.BusyIndicator.show(0);
      await this._fetchCommonData("CompanyCodeDetails", "CompanyCodeDetailsModel", { branchCode: branchCode });
      var oCompanyDetailsModel = this.getView().getModel("CompanyCodeDetailsModel").getProperty("/0");
      if (!oCompanyDetailsModel || !oCompanyDetailsModel.companylogo) {
        sap.ui.core.BusyIndicator.hide();
        MessageToast.show("Company not found on selected branch. Please check and try again.");
        return;
      }
      if (!oCompanyDetailsModel.companylogo64 && !oCompanyDetailsModel.signature64) {
        var logoBase64 = this._convertBLOBtoBASE64(oCompanyDetailsModel.companylogo?.data);
        var signBase64 = this._convertBLOBtoBASE64(oCompanyDetailsModel.signature?.data);
        if (logoBase64 && signBase64) {
          oCompanyDetailsModel.companylogo64 = "data:image/png;base64," + logoBase64;
          oCompanyDetailsModel.signature64 = "data:image/png;base64," + signBase64;
        }
      }
      if (oCompanyDetailsModel.companylogo64 && oCompanyDetailsModel.signature64) {
        if (typeof jsPDF !== "undefined" && typeof jsPDF._GeneratePDF === "function") {
          sap.ui.core.BusyIndicator.show(0);
          jsPDF._GeneratePDF(content, oCompanyDetailsModel, oModel);
        } else {
          sap.ui.core.BusyIndicator.hide();
          console.error("Error: jsPDF._GeneratePDF function not found.");
        }
      }
    },
    //common confirmation dialog box
    showConfirmationDialog: function (sTitle, sMessage, fnOnConfirm, fnOnCancel, sOkText, sCancelText) {
      var oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();

      var dialog = new sap.m.Dialog({
        title: sTitle,
        type: "Message",
        content: new sap.m.Text({ text: sMessage }),
        beginButton: new sap.m.Button({
          text: sOkText || oResourceBundle.getText("OkButton"),
          type: "Accept",
          press: function () {
            sap.ui.core.BusyIndicator.show(0); // Show busy indicator

            dialog.close();

            setTimeout(function () {
              if (typeof fnOnConfirm === "function") {
                fnOnConfirm();
              }
              sap.ui.core.BusyIndicator.hide(); // Hide busy indicator after logic
            }, 100); // slight delay to ensure UI updates
          }
        }),
        endButton: new sap.m.Button({
          text: sCancelText || oResourceBundle.getText("CancelButton"),
          type: "Reject",
          press: function () {
            dialog.close();

            setTimeout(function () {
              if (typeof fnOnCancel === "function") {
                sap.ui.core.BusyIndicator.show(0);
                fnOnCancel();
                sap.ui.core.BusyIndicator.hide();
              }
            }, 100);
          }
        }),
        afterClose: function () {
          dialog.destroy();
        }
      });

      dialog.open();
      sap.ui.core.BusyIndicator.hide();
    },

    _initMessagePopover: function () {
      var i18n = this.getOwnerComponent().getModel("i18n").getResourceBundle();
      this.oMessagePopover = new sap.m.MessagePopover({
        items: [
          new sap.m.MessageItem({ type: "Information", title: "P - Present", description: i18n.getText("forP") }),
          new sap.m.MessageItem({ type: "Information", title: "A - Absent", description: i18n.getText("forA") }),
          new sap.m.MessageItem({ type: "Information", title: "H - Half-Day", description: i18n.getText("forH") }),
          new sap.m.MessageItem({ type: "Information", title: "LA - Late", description: i18n.getText("forLA") }),
          new sap.m.MessageItem({ type: "Information", title: "L - Leave", description: i18n.getText("forL") }),
          new sap.m.MessageItem({ type: "Information", title: "SP - Present on Sunday", description: i18n.getText("forSP") }),
          new sap.m.MessageItem({ type: "Information", title: "SA - Absent on Sunday", description: i18n.getText("forSA") }),
          new sap.m.MessageItem({ type: "Information", title: "SH - Half-Day on Sunday", description: i18n.getText("forSH") }),
          new sap.m.MessageItem({ type: "Information", title: "SLA - Late on Sunday", description: i18n.getText("forSLA") }),
          new sap.m.MessageItem({ type: "Information", title: "SL - Leave on Sunday", description: i18n.getText("forSL") })
        ]
      });
      this.getView().addDependent(this.oMessagePopover);
    },

    FST_onEnableImport: function () {
      var branch = this.byId("FST_id_FilterBranch");
      var date = this.byId("FST_id_MonthYearPicker");
      if (!branch.getValue() || !date.getValue()) {
        this.byId("FST_id_ImportBtn").setEnabled(false);
        this.byId("MP_id_GoBtn").setEnabled(false);
      }
      else {
        this.byId("FST_id_ImportBtn").setEnabled(true);
        this.byId("MP_id_GoBtn").setEnabled(true);
      }
    },

    updateDaysInColumns: function (pickerYear, pickerMonth) {
      var daysInMonth = new Date(pickerYear, pickerMonth, 0).getDate(); // Get number of days in the month
      for (var day = 1; day <= daysInMonth; day++) {
        var date = new Date(pickerYear, pickerMonth - 1, day); // JS months are 0-indexed
        var weekday = date.toLocaleString('en-US', { weekday: 'short' }); // e.g., Sun, Mon
        var text = day + "\n" + weekday;
        var columnId = "idDay" + day;
        var oColumnText = this.byId(columnId);
        if (oColumnText) {
          oColumnText.setText(text);
        }
      }
    },

    resetColumnHeaders: function () {
      for (var i = 1; i <= 31; i++) {
        var columnId = "idDay" + i;
        var oColumnText = this.byId(columnId);
        if (oColumnText) {
          oColumnText.setText(i.toString());
        }
      }
    },

    _commonGETCall: async function (sEntity, sModelName, oFilter) {
      try {
        var response = await this.ajaxReadWithJQuery(sEntity, oFilter);
        if (response.success) {
          this.oModel.setProperty("/" + sModelName, response.data || response.results);
        } else {
          console.error(response);
          sap.m.MessageToast.show(this.i18nModel.getText("msgFailedToFetch"));
        }
      }
      catch (e) {
        console.error(e);
      }
    },

    checkLoginModel: function () {
      if (!this.getView().getModel("LoginModel")) {
        sap.ui.core.BusyIndicator.hide();
        this.getRouter().navTo("RouteLoginPage");
      }
    },
    onClearAndSearch: function (sFilterBarId) {
      var oFilterBar = this.byId(sFilterBarId);
      if (oFilterBar) {
        oFilterBar.clear(); // Clear all filters in the FilterBar
      }
    },

    getBusyDialog: function () {
      if (!this._pBusyDialog) {
        this._pBusyDialog = sap.ui.core.Fragment.load({
          name: "sap.kt.com.minihrsolution.fragment.BusyIndicator",
          controller: this
        }).then(function (oBusyDialog) {
          this.getView().addDependent(oBusyDialog);
          return oBusyDialog;
        }.bind(this));
      }

      this._pBusyDialog.then(function (oBusyDialog) {
        this.oBusyDialog = oBusyDialog;
        this.oBusyDialog.open();
        // setTimeout(function() {
        // this._pBusyDialog.then(function(oBusyDialog) {
        // oBusyDialog.close();
        // });
        // }.bind(this), 5000);
      }.bind(this));
    },

    closeBusyDialog: function () {
      if (this.oBusyDialog) {
        //this._pBusyDialog.then(function (oBusyDialog) {
          this.oBusyDialog.close();
       // });
      }
    },

    CommonVisitingCard: async function (EmployeeName, MobileNo, Email, Designation, branchCode) {
      const { jsPDF } = window.jspdf;
      sap.ui.core.BusyIndicator.show(0); // Show Busy indicator
  
      try {
         await this._fetchCommonData("CompanyCodeDetails", "CompanyCodeDetailsModel", { branchCode: branchCode });
         var oCompanyDetailsModel = this.getView().getModel("CompanyCodeDetailsModel").getProperty("/0");
  
          const visitfrontBase64 = this._convertBLOBtoBASE64(oCompanyDetailsModel.visitingCardFront?.data);
          const visitbackBase64 = this._convertBLOBtoBASE64(oCompanyDetailsModel.visitingCardBack?.data);
          const address = oCompanyDetailsModel.shortAddress;
          const companyurl = oCompanyDetailsModel.website;
  
          const doc = new jsPDF({
              orientation: "landscape",
              unit: "mm",
              format: [50.8, 88.9] // 3.5 x 2 inches
          });
  
          // Add Front Background
          doc.addImage(visitfrontBase64, "JPEG", 0, 0, 88.9, 50.8);
  
          // Add Employee Info
          doc.setFontSize(12);
          doc.setTextColor("#FFFFFF");
          doc.setFont("times", "bold");
          doc.text(EmployeeName, 5, 8);
  
          doc.setFontSize(8);
          doc.setFont("times", "normal");
          doc.text(Designation, 5, 12);
  
          doc.setFontSize(6.5);
          doc.text(`+91 ${MobileNo}`, 13, 23);
  
          const emailLines = doc.splitTextToSize(Email, 33);
          doc.text(emailLines, 13, 29);
  
          doc.setTextColor("#FFFFFF");
          doc.textWithLink(companyurl, 13, 38, { url: companyurl });
  
          const addressLines = doc.splitTextToSize(address, 44);
          doc.text(addressLines, 13, 45);
  
          // Add Back Page
          doc.addPage();
          doc.addImage(visitbackBase64, "JPEG", 0, 0, 88.9, 50.8);
  
          // Save PDF
          doc.save(`${EmployeeName}_VisitingCard.pdf`);
      } catch (error) {
          sap.m.MessageToast.show(error.message || error.responseText);
      } finally {
          sap.ui.core.BusyIndicator.hide();
      }
  },
  })
});