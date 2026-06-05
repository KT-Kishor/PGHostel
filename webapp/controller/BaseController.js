sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "../model/formatter",
  "sap/ui/unified/CalendarLegend",
  "sap/ui/unified/CalendarLegendItem",
  "sap/ui/unified/DateTypeRange"
], function (Controller, JSONModel, Formatter) {
  "use strict";

  return Controller.extend("sap.ui.com.project1.controller.BaseController", {
    Formatter: Formatter,
    // Router Code 

    //Common read call for all the app
    async ajaxReadWithJQuery(sUrl, filter) {
      const queryString = new URLSearchParams(filter).toString();
      return new Promise((resolve, reject) => {
        $.ajax({
          url: this.getOwnerComponent().getModel("LoginModel").getData().url + sUrl + "?" + queryString,
          method: "GET",
          headers: this.getOwnerComponent().getModel("LoginModel").getData().headers,
          success: (data) => {
            resolve(data);
          },
          error: (error) => {
            reject(error);
          }
        });
      });
    },

    // 1. Router access - completely safe
    getRouter: function () {
      return sap.ui.core.UIComponent.getRouterFor(this);
    },

    // 3. Navigation helper (optional, but consistent with other controllers)
    navTo: function (routeName, parameters, bReplace) {
      this.getRouter().navTo(routeName, parameters, bReplace);
    },

    // 4. Check if model exists helper (optional)
    getModel: function (sName) {
      return this.getView().getModel(sName);
    },

    // 5. Set model helper (optional)
    setModel: function (oModel, sName) {
      return this.getView().setModel(oModel, sName);
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
      return new Promise((resolve, reject) => {
        $.ajax({
          url: this.getView().getModel("LoginModel").getData().url + sUrl,
          method: "DELETE",
          contentType: "application/json",
          dataType: "json",
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

    _ViewDatePickersReadOnly: function (aIds, oView) {
      aIds.forEach(function (sId) {
        var oDatePicker = oView.byId(sId);
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

    getBusyDialog: function () {
      if (!this._pBusyDialog) {
        this._pBusyDialog = sap.ui.core.Fragment.load({
          name: "sap.ui.com.project1.fragment.BusyIndicator",
          controller: this
        }).then(function (oBusyDialog) {
          this.getView().addDependent(oBusyDialog);
          return oBusyDialog;
        }.bind(this));
      }

      this._pBusyDialog.then(function (oBusyDialog) {
        this.oBusyDialog = oBusyDialog;
        this.oBusyDialog.open();

      }.bind(this));
    },

    closeBusyDialog: function () {
      if (this.oBusyDialog) {
        this.oBusyDialog.close();
      }
    },

    _fetchCommonData: async function (entityName, modelName, filter = "") {
      if (modelName.split(" ")[1] === "TraineeFlag") {
        var flag = modelName.split(" ")[1]
        modelName = modelName.split(" ")[0];
      }
      if (!this.getOwnerComponent().getModel("LoginModel")) {
        this.closeBusyDialog();
        return;
      }
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
              if (flag === "TraineeFlag") {
                this.closeBusyDialog();
              }
            }.bind(this),
            error: function (err) {
              reject(err);
            }
          });
        });

      } catch (error) {
        sap.m.MessageToast.show(error.responseJSON?.message || "Technical Error, Please Contact the Administrator");
      }
    },

    onClearAndSearch: function (sFilterBarId) {
      var oFilterBar = this.byId(sFilterBarId);
      if (oFilterBar) {
        oFilterBar.clear(); // Clear all filters in the FilterBar
      }
    },

    _carouselTimers: new Map(),

    /* Start auto-slide + interaction handling using native SAP UI5 Carousel properties */
    _startAllCarouselsAutoSlide: function (iDelay = 3000) {
      try {
        const oView = this.getView();
        if (!oView) return;

        const aCarousels = oView.findAggregatedObjects(true, c => c?.isA("sap.m.Carousel"));

        aCarousels.forEach(carousel => {
          if (!carousel || carousel.bIsDestroyed) return;

          const pages = carousel.getPages();
          if (!pages || pages.length <= 1) return;

          /* Stop any old timers for this carousel (for backward compatibility) */
          this._clearCarouselTimer(carousel.getId());

          /* Use native SAP UI5 Carousel auto-play properties instead of manual setInterval */
          carousel.setAutoPlay(true);
          carousel.setAutoPlayDelay(iDelay);

          /* ------------ USER INTERACTION LOGIC ------------- */

          /* Pause immediately when user touches/clicks */
          const fnPause = () => {
            carousel.setAutoPlay(false);
            carousel._userTouched = true;
          };

          carousel.attachBrowserEvent("touchstart", fnPause);
          carousel.attachBrowserEvent("mousedown", fnPause);

          /* If the user swipes to the next image → resume after delay */
          if (carousel.onAfterSwipe) {
            const origSwipeFn = carousel.onAfterSwipe.bind(carousel);

            carousel.onAfterSwipe = (e) => {
              origSwipeFn?.(e);
              clearTimeout(carousel._resumeTimer);

              carousel._resumeTimer = setTimeout(() => {
                if (carousel && !carousel.bIsDestroyed && pages.length > 1) {
                  carousel.setAutoPlay(true);
                }
              }, 2000); // resume 2 sec after swipe
            };
          }

          /* If user just taps without swiping → resume later */
          const fnEnd = () => {
            clearTimeout(carousel._resumeTimer);
            carousel._resumeTimer = setTimeout(() => {
              if (carousel && !carousel.bIsDestroyed && pages.length > 1) {
                carousel.setAutoPlay(true);
              }
            }, 3000); // resume after 3 sec idle
          };

          carousel.attachBrowserEvent("touchend", fnEnd);
          carousel.attachBrowserEvent("mouseup", fnEnd);

          /* ------------ END INTERACTION LOGIC ------------- */
        });

      } catch (err) {
        console.error("Auto Slide Error:", err);
      }
    },

    /* Stop autoplay for one carousel - using native auto-play properties */
    _pauseCarouselAutoSlide: function (carousel) {
      carousel.setAutoPlay(false);
      // Also clear any manual timer for backward compatibility
      const id = carousel.getId();
      if (this._carouselTimers.has(id)) {
        clearInterval(this._carouselTimers.get(id));
        this._carouselTimers.delete(id);
      }
    },

    /* Resume autoplay safely - using native auto-play properties */
    _resumeCarouselAutoSlide: function (carousel, iDelay = 3000) {
      if (!carousel || carousel.bIsDestroyed) return;

      const pages = carousel.getPages();
      if (!pages || pages.length <= 1) return;

      // Use native auto-play
      carousel.setAutoPlayDelay(iDelay);
      carousel.setAutoPlay(true);
    },

    /* Kill all autoplay timers */
    _clearCarouselTimer: function (id) {
      if (this._carouselTimers.has(id)) {
        clearInterval(this._carouselTimers.get(id));
        this._carouselTimers.delete(id);
      }
    },

    _clearAllCarouselTimers: function () {
      this._carouselTimers.forEach(interval => clearInterval(interval));
      this._carouselTimers.clear();
    },

    /* Auto cleanup with View destruction */
    onExit: function () {
      this._clearAllCarouselTimers();
    },

    scrollToSection: function (pageId, sectionId) {
      var page = this.byId(pageId);
      if (page && sectionId) {
        page.scrollToSection(this.byId(sectionId).getId());
      }
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

    convertNumberToWords: function (value, currency) {
      return new Promise((resolve, reject) => {
        if (typeof value !== 'number') {
          value = parseFloat(value);
          if (isNaN(value)) {
            return reject(new TypeError('The value must be a valid number.'));
          }
        }
        if (typeof currency !== 'string' || currency.trim() === '') {
          return reject(new TypeError('The currency code must be a non-empty string.'));
        }

        const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
        const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
        const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

        const convertLessThanOneThousand = (num) => {
          let result = '';
          if (num >= 100) {
            result += units[Math.floor(num / 100)] + ' Hundred';
            num %= 100;
            if (num > 0) result += ' ';
          }
          if (num >= 20) {
            result += tens[Math.floor(num / 10)];
            num %= 10;
            if (num > 0) result += ' ';
          }
          if (num >= 10) {
            return result + teens[num - 10];
          }
          if (num > 0) {
            result += units[num];
          }
          return result.trim();
        };

        const toWordsIndian = (num) => {
          if (num === 0) return 'Zero';
          let words = '';
          const croreOfCrores = Math.floor(num / 100000000000000);
          if (croreOfCrores > 0) {
            words += toWordsIndian(croreOfCrores) + ' Crore ';
            num %= 100000000000000;
          }
          const lakhCrores = Math.floor(num / 1000000000000);
          if (lakhCrores > 0) {
            words += convertLessThanOneThousand(lakhCrores) + ' Lakh ';
            num %= 1000000000000;
          }
          const thousandCrores = Math.floor(num / 10000000000);
          if (thousandCrores > 0) {
            words += convertLessThanOneThousand(thousandCrores) + ' Thousand ';
            num %= 10000000000;
          }
          const crores = Math.floor(num / 10000000);
          if (crores > 0) {
            words += convertLessThanOneThousand(crores) + ' Crore ';
            num %= 10000000;
          }
          const lakhs = Math.floor(num / 100000);
          if (lakhs > 0) {
            words += convertLessThanOneThousand(lakhs) + ' Lakh ';
            num %= 100000;
          }
          const thousands = Math.floor(num / 1000);
          if (thousands > 0) {
            words += convertLessThanOneThousand(thousands) + ' Thousand ';
            num %= 1000;
          }
          if (num > 0) {
            words += convertLessThanOneThousand(num);
          }
          return words.trim();
        };

        const toWordsWestern = (num) => {
          if (num === 0) return 'Zero';
          let words = '';
          const quadrillions = Math.floor(num / 1000000000000000);
          if (quadrillions > 0) {
            words += toWordsWestern(quadrillions) + ' Quadrillion ';
            num %= 1000000000000;
          }
          const trillions = Math.floor(num / 1000000000000);
          if (trillions > 0) {
            words += toWordsWestern(trillions) + ' Trillion ';
            num %= 1000000000000;
          }
          const billions = Math.floor(num / 1000000000);
          if (billions > 0) {
            words += toWordsWestern(billions) + ' Billion ';
            num %= 1000000000;
          }
          const millions = Math.floor(num / 1000000);
          if (millions > 0) {
            words += convertLessThanOneThousand(millions) + ' Million ';
            num %= 1000000;
          }
          const thousands = Math.floor(num / 1000);
          if (thousands > 0) {
            words += convertLessThanOneThousand(thousands) + ' Thousand ';
            num %= 1000;
          }
          if (num > 0) {
            words += convertLessThanOneThousand(num);
          }
          return words.trim();
        };


        let currencyConfig = {
          majorSingular: 'Dollar',
          majorPlural: 'Dollars',
          minorSingular: 'Cent',
          minorPlural: 'Cents',
          system: 'Western'
        };

        const upperCurrency = currency.toUpperCase();

        if (upperCurrency === 'INR') {
          currencyConfig = {
            majorSingular: 'Rupee',
            majorPlural: 'Rupees',
            minorSingular: 'Paisa',
            minorPlural: 'Paise',
            system: 'Indian'
          };
        } else if (upperCurrency === 'AED') {
          currencyConfig = {
            majorSingular: 'Dirham',
            majorPlural: 'Dirhams',
            minorSingular: 'Fils',
            minorPlural: 'Fils',
            system: 'Western'
          };
        }

        const integerPart = Math.floor(value);
        const decimalPart = Math.round((value - integerPart) * 100);

        if (integerPart === 0 && decimalPart === 0) {
          return resolve(`Zero ${currencyConfig.majorPlural}`);
        }

        let integerWords = '';
        if (integerPart > 0) {
          if (currencyConfig.system === 'Indian') {
            integerWords = toWordsIndian(integerPart);
          } else {
            integerWords = toWordsWestern(integerPart);
          }
        }


        const majorUnit = integerPart === 1 ? currencyConfig.majorSingular : currencyConfig.majorPlural;
        let finalResult = integerPart > 0 ? `${integerWords} ${majorUnit}` : '';

        if (decimalPart > 0) {
          const decimalWords = convertLessThanOneThousand(decimalPart);
          const minorUnit = decimalPart === 1 ? currencyConfig.minorSingular : currencyConfig.minorPlural;
          if (finalResult) {
            finalResult += ` and ${decimalWords} ${minorUnit}`;
          } else {
            finalResult = `${decimalWords} ${minorUnit}`;
          }
        }

        resolve(`${finalResult.trim()} Only`);
      });
    },

    getI18nText: function (sKey, aParams) {
      const oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
      return oResourceBundle.getText(sKey, aParams);
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
      const MAX_TOTAL_SIZE = 20 * 1024 * 1024; // 20 MB

      // No file selected
      if (!oFiles.length) {
        sap.m.MessageToast.show(oContext.getI18nText(sNoFileKey));
        return;
      }

      let attachments = oModel.getProperty(sAttachmentPath) || [];
      let uploadedFileNames = oModel.getProperty(sNamePath)
        ? oModel.getProperty("/attachments").map((item) => item.filename)
        : [];
      let currentTotalSize = attachments.reduce((sum, file) => sum + file.size, 0);

      // Calculate total size including new files
      let newFilesTotalSize = Array.from(oFiles).reduce((sum, file) => sum + file.size, 0);
      let finalTotalSize = currentTotalSize + newFilesTotalSize;

      // Check total size constraint
      if (finalTotalSize > MAX_TOTAL_SIZE) {
        sap.m.MessageToast.show("Total File Size Should not Exceed 20 MB.");
        return;
      }

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
            fileType: oFile.name.split(".")[(oFile.name.split(".").length - 1)],
            content: sFileBinary,
            encoding: "base64",
            size: oFile.size // Store file size for future calculations
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

    onAttachmentsTableDelete: function (oEvent) {
      const oTableItem = oEvent.getParameter("listItem"); // the item being deleted
      const oTable = oEvent.getSource(); // the table

      // Get model
      const oModel = this.getView().getModel("UploaderData");
      const aItems = oModel.getProperty("/attachments");

      // Find the index of the deleted item
      const iIndex = oTable.indexOfItem(oTableItem);

      if (iIndex > -1) {
        aItems.splice(iIndex, 1); // remove 1 item at that index
        oModel.setProperty("/attachments", aItems); // update the model
      }
    },

    showConfirmationDialog: function (sTitle, sMessage, fnOnConfirm, fnOnCancel, sOkText, sCancelText) {
      var oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();

      var dialog = new sap.m.Dialog({
        title: sTitle,
        type: "Message",
        icon: "sap-icon://question-mark",
        content: new sap.m.Text({ text: sMessage }),
        beginButton: new sap.m.Button({
          text: sOkText || oResourceBundle.getText("OkButton"),
          press: function () {
            dialog.close();

            // this.getBusyDialog(); // open BusyDialog immediately
            Promise.resolve()
              .then(function () {
                if (typeof fnOnConfirm === "function") {
                  return fnOnConfirm();
                }
              }.bind(this))
              .finally(function () {
                // this.closeBusyDialog(); // Always close BusyDialog
              }.bind(this));
          }.bind(this)
        }).addStyleClass("myUnifiedBtn"),
        endButton: new sap.m.Button({
          text: sCancelText || oResourceBundle.getText("CancelButton"),
          press: function () {
            dialog.close();

            // this.getBusyDialog(); // open BusyDialog immediately
            Promise.resolve()
              .then(function () {
                if (typeof fnOnCancel === "function") {
                  return fnOnCancel();
                }
              }.bind(this))
              .finally(function () {
                // this.closeBusyDialog(); // Always close BusyDialog
              }.bind(this));
          }.bind(this)
        }).addStyleClass("myUnifiedBtn"),
        afterClose: function () {
          dialog.destroy();
        }
      });

      dialog.open();
    },

   LCommonLogoutFunction: function () {
      var oLoginModel = this.getOwnerComponent().getModel("LoginModel");
      const oUIModel = this.getOwnerComponent().getModel("UIModel");
      oUIModel.setProperty("/isLoggedIn", false);
      if (oLoginModel) {
        oLoginModel.setProperty("/EmployeeID", "");
        oLoginModel.setProperty("/UserID", "");
        oLoginModel.setProperty("/UserName", "");
        oLoginModel.setProperty("/EmployeeName", "");
        oLoginModel.setProperty("/Role", "");
        oLoginModel.setProperty("/BranchCode", "");

        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("_x9A1p");
        localStorage.removeItem("_k7LmQ");
        localStorage.removeItem("_aB39X");
        localStorage.removeItem("_mN72P");
        localStorage.removeItem("activeTabs");
      }
      this.getOwnerComponent().getRouter().navTo("RouteHostel");
    },


    initializeLoginModel: function () {
      let oLoginModel = this.getOwnerComponent().getModel("LoginModel");
      if (!oLoginModel) {
        oLoginModel = new JSONModel({
          // Database connection
          url: "https://rest.kalpavrikshatechnologies.com/stayvriksha/",
          headers: {
            name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
            password: "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u",
            "Content-Type": "application/json"
          },
          isRadioVisible: false
        });
        this.getOwnerComponent().setModel(oLoginModel, "LoginModel");
      }
    },
    commonLoginFunction: async function (value) {
      const isLoggedIn = localStorage.getItem("isLoggedIn");
      this.getView().getModel("UIModel").setProperty("/isLoggedIn", isLoggedIn === "true");
      // Check local login session
      if (isLoggedIn !== "true") {
        this.getRouter().navTo("RouteHostel");
        return false;
      }

      try {
        // Open Busy Dialog
        if (this.openBusyDialog) this.openBusyDialog();

        // Initialize Login Model
        this.initializeLoginModel();

        // Get Local Storage Data
        const sEncodedEmployeeID = localStorage.getItem("_aB39X");
        const sEncodedEmployeeName = localStorage.getItem("_mN72P");

        // Validate Local Storage
        if (!sEncodedEmployeeID || !sEncodedEmployeeName) {
          this.closeBusyDialog();
          this.getRouter().navTo("RouteHostel");
          return false;
        }

        let sEmployeeID = "";
        let sEmployeeName = "";

        // Decode Base64 Safely
        try {
          sEmployeeID = atob(sEncodedEmployeeID);
          sEmployeeName = atob(sEncodedEmployeeName);
        } catch (e) {
          localStorage.clear();
          this.closeBusyDialog();
          sap.m.MessageToast.show("Session Invalid");
          this.getRouter().navTo("RouteHostel");
          return false;
        }

        // Get Encrypted Values
        const sEncryptedEmployeeID = localStorage.getItem("_x9A1p");
        const sEncryptedEmployeeName = localStorage.getItem("_k7LmQ");

        // Validate Encrypted Values
        if (!sEncryptedEmployeeID || !sEncryptedEmployeeName) {
          localStorage.clear();
          this.closeBusyDialog();
          sap.m.MessageToast.show("Session Invalid");
          this.getRouter().navTo("RouteHostel");
          return false;
        }

        // Compare bcrypt values
        const bEmployeeIDMatch = dcodeIO.bcrypt.compareSync(sEmployeeID, sEncryptedEmployeeID);

        const bEmployeeNameMatch = dcodeIO.bcrypt.compareSync(sEmployeeName, sEncryptedEmployeeName);

        // Invalid Session
        if (!bEmployeeIDMatch || !bEmployeeNameMatch) {
          localStorage.clear();
          this.closeBusyDialog();
          sap.m.MessageToast.show("Session Invalid");
          this.getRouter().navTo("RouteHostel");
          return false;
        }

        // Backend Validation
        const result = await this.ajaxReadWithJQuery("HM_Login", {
          UserID: sEmployeeID,
          UserName: sEmployeeName
        });

        // Validate Response
        if (!result || !result.data || result.data.length === 0) {
          localStorage.clear();
          this.closeBusyDialog();
          this.getRouter().navTo("RouteHostel");
          return false;
        }

        // Get User Object
        const user = result.data;

        // Login Model
        let oLoginModel = this.getOwnerComponent().getModel("LoginModel");

        let oHostelModel = new sap.ui.model.json.JSONModel({});
        this.getOwnerComponent().setModel(oHostelModel, "HostelModel")

        if (!oLoginModel) {
          oLoginModel = new sap.ui.model.json.JSONModel({});
          this.getOwnerComponent().setModel(oLoginModel, "LoginModel");
        }

        // Set User Data
        oLoginModel.setProperty("/EmployeeID", user.UserID || "");
        oLoginModel.setProperty("/UserID", user.UserID || "");
        oLoginModel.setProperty("/Salutation", user.Salutation || "");
        oLoginModel.setProperty("/EmployeeName", user.UserName || "");
        oLoginModel.setProperty("/UserName", user.UserName || "");
        oLoginModel.setProperty("/EmailID", user.EmailID || "");
        oLoginModel.setProperty("/Role", user.Role || "");
        oLoginModel.setProperty("/BranchCode", user.BranchCode || "");
        oLoginModel.setProperty("/STDCode", user.STDCode || "");
        oLoginModel.setProperty("/MobileNo", user.MobileNo || "");
        oLoginModel.setProperty("/Gender", user.Gender || "");
        oLoginModel.setProperty("/Country", user.Country || "");
        oLoginModel.setProperty("/State", user.State || "");
        oLoginModel.setProperty("/City", user.City || "");
        oLoginModel.setProperty("/Address", user.Address || "");
        oLoginModel.setProperty("/DateofBirth", user.DateOfBirth ? this.Formatter.DateFormat(user.DateOfBirth) : "");

        this.getView().getModel("UIModel").setProperty("/isLoggedIn", true);

        oHostelModel.setProperty("/UserID", user.UserID);
        oHostelModel.setProperty("/Salutation", user.Salutation);
        oHostelModel.setProperty("/STDCode", user.STDCode || "");
        oHostelModel.setProperty("/Gender", user.Gender || "");
        oHostelModel.setProperty("/DateOfBirth", user.DateOfBirth ? this.Formatter.DateFormat(user.DateOfBirth) : "");
        oHostelModel.setProperty("/FullName", user.UserName || "");
        oHostelModel.setProperty("/CustomerEmail", user.EmailID || "");
        oHostelModel.setProperty("/MobileNo", user.MobileNo || "");
        oHostelModel.setProperty("/Country", user.Country || "");
        oHostelModel.setProperty("/State", user.State || "");
        oHostelModel.setProperty("/City", user.City || "");
        oHostelModel.setProperty("/Address", user.Address || "");

        // If already logged in and opening Login Page
        if (value === "Booking") return true;

        if (isLoggedIn === "true" && value === "LoginPage" || value === "TilePage" || value === "ManageProfile") {
          if (value === "ManageProfile") {
            this.getRouter().navTo("RouteManageProfile");
          } else if (user.Role === "Customer") {
            this.getRouter().navTo("RouteHostel");
          } else {
            this.getRouter().navTo("TilePage");
          }
          return true;
        }

        // App Visibility Model
        const oView = this.getView && this.getView();
        const TileModel = this.getView().getModel("TileVisibility")

        // Helper Fail Function
        const fail = () => {
          this.closeBusyDialog();
          this.getRouter().navTo("RouteHostel");
          return false;
        };

        // Validate User
        const userId = oLoginModel.getProperty("/EmployeeID");
        const userName = oLoginModel.getProperty("/EmployeeName");

        if (!userId || !userName) {
          return fail();
        }

        // Tile Permission Check
        if (value && TileModel && value !== "LoginPage" && value !== "TilePage" && value === "ManageProfile") {

          const tileMap = {
            "ManageCustomer": "/ManageCustomer",
            "ManageRooms": "/ManageRooms",
            "ManageBedType": "/ManageBedType",
            "ManageFacility": "/ManageFacility",
            "ManageBranch": "/ManageBranch",
            "ManageAmenities": "/ManageAmenities",
            "ManageInvoice": "/ManageInvoice",
            "ManageCoupon": "/ManageCoupon",
            "ManageStaff": "/ManageStaff",
            "ManageVendor": "/ManageVendor",
            "ManagePaymentDashboard": "/ManagePaymentDashboard",
            "ManageBookingDashboard": "/ManageBookingDashboard",
            "ManageSecurityDeposit": "/ManageSecurityDeposit",
            "ManagePaymentHistory": "/ManagePaymentHistory",
            "ManageCustomerReview": "/ManageCustomerReview",
            "ManageComplainDashboard": "/ManageComplainDashboard",
            "ManageDamage": "/ManageDamage",
            "DamageDashboard": "/DamageDashboard"
          };

          const modelPath = tileMap[value];

          // Access Denied
          if (modelPath && TileModel.getProperty(modelPath) === "0") {
            return fail();
          }
        }

        return true;

      } catch (error) {
        localStorage.clear();
        this.closeBusyDialog();
        this.getRouter().navTo("RouteHostel");
        return false;
      }
    },

    // @BaseController.js  —  TOUR GUIDE section(v6)

    // ─── TOUR: Public API ─────────────────────────────────────────────────────────
    initUniversalTour: function (aSteps) {
      this._aTourSteps = (aSteps || []).slice();
      this._iTourIndex = 0;
      this._showTourStep(0);
    },

    // ─── TOUR: Core step renderer ─────────────────────────────────────────────────
    _showTourStep: function (iIndex) {
      var that = this;
      var aSteps = this._aTourSteps;

      if (!aSteps || iIndex >= aSteps.length) {
        this._cleanupTour();
        return;
      }

      var oStepData = aSteps[iIndex];
      var oComponent = this.getOwnerComponent();

      if (!this._oGuideModel) {
        this._oGuideModel = oComponent.getModel("guideModel");
        if (!this._oGuideModel) {
          this._oGuideModel = new sap.ui.model.json.JSONModel();
          oComponent.setModel(this._oGuideModel, "guideModel");
        }
      }

      this._oGuideModel.setData({
        currentStep: {
          title: oStepData.title || "",
          description: oStepData.description || "",
          media: oStepData.media || "",
          stepText: "Step " + (iIndex + 1) + " of " + aSteps.length
        },
        isLast: iIndex === aSteps.length - 1
      });

      var oAnchor = this.getView().byId(oStepData.ui5Id);
      if (!oAnchor) {
        this.onNextTourStep();
        return;
      }

      var fnOpen = function () {
        if (!that._oGuidePopover) {
          that.loadFragment({
            name: "sap.ui.com.project1.fragment.GuidePopover"
          }).then(function (oPopover) {
            that._oGuidePopover = oPopover;
            oPopover.addEventDelegate({
              onkeydown: function (oEvent) {
                if (oEvent.key === "Escape" || oEvent.keyCode === 27) {
                  oEvent.preventDefault();
                  oEvent.stopPropagation();
                  that._cleanupTour();
                }
              }
            });
            that.getView().addDependent(oPopover);
            sap.ui.getCore().applyChanges();
            that._openStep(oPopover, oAnchor);
          });
        } else {
          that._openStep(that._oGuidePopover, oAnchor);
        }
      };

      if (!oAnchor.getDomRef()) {
        var oDelegate = {
          onAfterRendering: function () {
            oAnchor.removeEventDelegate(oDelegate);
            fnOpen();
          }
        };
        oAnchor.addEventDelegate(oDelegate);
      } else {
        fnOpen();
      }
    },


    // ─── TOUR: Open + position a step ─────────────────────────────────────────────
    _openStep: function (oPopover, oAnchor) {
      var that = this;
      var vw = window.innerWidth || document.documentElement.clientWidth;
      var bMobile = (vw < 600);

      oPopover.setModel(this._oGuideModel, "guideModel");
      this._setPopoverVisible(oPopover, false);

      var fnProceed = function () {
        that._highlightElement(oAnchor);
        if (bMobile) {
          that._openMobileStep(oPopover, oAnchor);
        } else {
          that._openDesktopStep(oPopover, oAnchor);
        }
      };

      if (oPopover.isOpen()) {
        oPopover.attachEventOnce("afterClose", fnProceed);
        oPopover.close();
      } else {
        fnProceed();
      }
    },

    // ─── MOBILE: open invisible → measure → pin top or bottom → ONE scroll → reveal

    _openMobileStep: function (oPopover, oAnchor) {
      var that = this;
      var BOTTOM_MARGIN = 16;
      var TILE_GAP = 12;
      var TILE_ZONE = 0.3; // tile top at 30% of viewport

      var vh = window.innerHeight || document.documentElement.clientHeight;

      this._setPopoverVisible(oPopover, false);
      oPopover.setContentWidth("calc(100vw - 32px)");
      oPopover.setOffsetX(0);
      oPopover.setOffsetY(0);
      oPopover.setPlacement(sap.m.PlacementType.Bottom);

      var aDom = oAnchor.getDomRef();
      if (!aDom) {
        this._setPopoverVisible(oPopover, true);
        return;
      }

      var oScroll =
        aDom.closest(".sapMPageScrollCont") ||
        aDom.closest(".sapMScrollCont") ||
        aDom.closest(".sapUiScrollDelegate");

      // LAST STEP SPECIAL CASE
      var bIsLast = (this._iTourIndex === this._aTourSteps.length - 1);
      if (bIsLast) {
        this._openLastMobileStep(oPopover, oAnchor);
        return;
      }

      // ── Pre-scroll the tile so popover has room below
      var tileRect = aDom.getBoundingClientRect();
      var scrollTopTarget = tileRect.top - vh * TILE_ZONE;

      if (oScroll) {
        oScroll.scrollBy({ top: scrollTopTarget, behavior: "instant" });
      } else {
        window.scrollBy({ top: scrollTopTarget, behavior: "instant" });
      }

      oPopover.attachEventOnce("afterOpen", function () {
        var oDom = oPopover.getDomRef();
        if (oDom) {
          var oScrollCont = oDom.querySelector(".sapMPopoverCont");
          if (oScrollCont) {
            oScrollCont.style.height = "";
            oScrollCont.style.maxHeight = "";
            oScrollCont.style.overflow = "visible";
          }
        }
        that._setPopoverVisible(oPopover, true);
      });

      oPopover.openBy(oAnchor);

      setTimeout(function () {
        that._setPopoverVisible(oPopover, true);
      }, 1000);
    },

    _openLastMobileStep: function (oPopover, oAnchor) {
      var that = this;
      var TILE_GAP = 12;
      var vh = window.innerHeight || document.documentElement.clientHeight;

      // Close popover first if open
      if (oPopover.isOpen()) {
        oPopover.attachEventOnce("afterClose", function () {
          that._forceOpenLastPopover(oPopover, oAnchor);
        });
        oPopover.close();
      } else {
        that._forceOpenLastPopover(oPopover, oAnchor);
      }
    },

    _forceOpenLastPopover: function (oPopover, oAnchor) {
      var that = this;
      var TILE_GAP = 12;
      var vh = window.innerHeight || document.documentElement.clientHeight;

      var aDom = oAnchor.getDomRef();
      if (!aDom) { return; }

      var oScroll =
        aDom.closest(".sapMPageScrollCont") ||
        aDom.closest(".sapMScrollCont") ||
        aDom.closest(".sapUiScrollDelegate");

      // Measure popover height
      oPopover.setPlacement(sap.m.PlacementType.Top);
      this._setPopoverVisible(oPopover, false);

      oPopover.attachEventOnce("afterOpen", function () {
        var oDom = oPopover.getDomRef();
        if (oDom) {
          that._setPopoverVisible(oPopover, true);
        }
      });

      // Scroll so tile + popover fully visible
      var tileRect = aDom.getBoundingClientRect();
      var popoverHeight = 300; // approximate, or measure dynamically if needed
      var scrollTopTarget = tileRect.bottom - vh + popoverHeight + TILE_GAP;

      if (oScroll) {
        oScroll.scrollBy({ top: scrollTopTarget, behavior: "instant" });
      } else {
        window.scrollBy({ top: scrollTopTarget, behavior: "instant" });
      }

      oPopover.openBy(oAnchor);
    },

    // ─── Helper: scroll container by delta, then callback ────────────────────────
    _scrollBy: function (oDomRef, iDelta, fnCallback) {
      var oScrollNode =
        oDomRef.closest(".sapMPageScrollCont") ||
        oDomRef.closest(".sapMScrollCont") ||
        oDomRef.closest(".sapUiScrollDelegate");

      if (oScrollNode) {
        oScrollNode.scrollBy({ top: iDelta, behavior: "smooth" });
      } else {
        window.scrollBy({ top: iDelta, behavior: "smooth" });
      }

      setTimeout(function () {
        requestAnimationFrame(function () {
          if (fnCallback) { fnCallback(); }
        });
      }, 420);
    },

    // ─── DESKTOP: scroll-settle-then-open ────────────────────────────────────────
    _openDesktopStep: function (oPopover, oAnchor) {
      var that = this;

      oPopover.setContentWidth("360px");
      oPopover.setOffsetX(0);
      oPopover.setOffsetY(0);

      var sBest = this._getBestPlacement(oAnchor, 360);
      var GAP = 12;
      oPopover.setPlacement(sBest);
      if (sBest === sap.m.PlacementType.Right) { oPopover.setOffsetX(GAP); }
      if (sBest === sap.m.PlacementType.Left) { oPopover.setOffsetX(-GAP); }
      if (sBest === sap.m.PlacementType.Bottom) { oPopover.setOffsetY(GAP); }
      if (sBest === sap.m.PlacementType.Top) { oPopover.setOffsetY(-GAP); }

      oPopover.attachEventOnce("afterOpen", function () {
        that._setPopoverVisible(oPopover, true);
      });

      this._scrollToAnchor(oAnchor, function () {
        requestAnimationFrame(function () {
          setTimeout(function () {
            requestAnimationFrame(function () {
              oPopover.openBy(oAnchor);
            });
          }, 100);
        });
      });

      setTimeout(function () {
        that._setPopoverVisible(oPopover, true);
      }, 600);
    },

    // ─── TOUR: Show / hide popover ────────────────────────────────────────────────
    _setPopoverVisible: function (oPopover, bVisible) {
      var oDom = oPopover.getDomRef();
      if (oDom) {
        if (bVisible) {
          oDom.classList.remove("tourPopoverHidden");
        } else {
          oDom.classList.add("tourPopoverHidden");
        }
      }
      oPopover._bTourHidden = !bVisible;
    },

    // ─── TOUR: Scroll anchor to center (desktop) ─────────────────────────────────
    _scrollToAnchor: function (oAnchor, fnCallback) {
      var oDomRef = oAnchor.getDomRef();
      if (!oDomRef) { fnCallback(); return; }

      var oScrollNode =
        oDomRef.closest(".sapMPageScrollCont") ||
        oDomRef.closest(".sapMScrollCont") ||
        oDomRef.closest(".sapUiScrollDelegate");

      var bNeedsScroll = false;

      if (oScrollNode) {
        var nodeRect = oDomRef.getBoundingClientRect();
        var scrollRect = oScrollNode.getBoundingClientRect();
        if (nodeRect.top < scrollRect.top || nodeRect.bottom > scrollRect.bottom) {
          bNeedsScroll = true;
          oScrollNode.scrollBy({
            top: nodeRect.top - scrollRect.top -
              (scrollRect.height / 2) + (nodeRect.height / 2),
            behavior: "smooth"
          });
        }
      } else {
        bNeedsScroll = true;
        oDomRef.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      }

      if (bNeedsScroll) {
        setTimeout(function () {
          requestAnimationFrame(function () {
            requestAnimationFrame(fnCallback);
          });
        }, 350);
      } else {
        requestAnimationFrame(fnCallback);
      }
    },

    // ─── TOUR: Best placement (desktop) ──────────────────────────────────────────
    _getBestPlacement: function (oAnchor, pw) {
      var oDom = oAnchor && oAnchor.getDomRef && oAnchor.getDomRef();
      if (!oDom) { return sap.m.PlacementType.PreferredBottomOrFlip; }

      var vw = window.innerWidth || document.documentElement.clientWidth;
      var vh = window.innerHeight || document.documentElement.clientHeight;
      var r = oDom.getBoundingClientRect();
      var m = 16;

      if (vw < 600) { return sap.m.PlacementType.Bottom; }
      if (vw - r.right >= pw + m) { return sap.m.PlacementType.Right; }
      if (r.left >= pw + m) { return sap.m.PlacementType.Left; }

      return (vh - r.bottom) >= r.top
        ? sap.m.PlacementType.PreferredBottomOrFlip
        : sap.m.PlacementType.PreferredTopOrFlip;
    },

    // ─── TOUR: Highlight ──────────────────────────────────────────────────────────
    _highlightElement: function (oControl) {
      document.querySelectorAll(".sapUiTourHighlight").forEach(function (el) {
        el.classList.remove("sapUiTourHighlight");
      });
      var oDomRef = oControl.getDomRef();
      if (oDomRef) {
        oDomRef.classList.add("sapUiTourHighlight");
        document.body.classList.add("sapUiTourOverlayActive");
      }
    },

    // ─── TOUR: Cleanup ────────────────────────────────────────────────────────────
    _cleanupTour: function () {
      document.body.classList.remove("sapUiTourOverlayActive");
      document.querySelectorAll(".sapUiTourHighlight").forEach(function (el) {
        el.classList.remove("sapUiTourHighlight");
      });
      this._iTourIndex = 0;
      this._aTourSteps = [];
      if (this._oGuidePopover && this._oGuidePopover.isOpen()) {
        this._setPopoverVisible(this._oGuidePopover, true);
        this._oGuidePopover.close();
      }
    },

    // ─── TOUR: Button handlers ────────────────────────────────────────────────────
    onNextTourStep: function () {
      this._iTourIndex = (this._iTourIndex || 0) + 1;
      if (this._iTourIndex >= this._aTourSteps.length) {
        this._cleanupTour();
        return;
      }
      this._showTourStep(this._iTourIndex);
    },

    onSkipTour: function () {
      this._cleanupTour();
    },

    onBeforePopoverClose: function (oEvent) {
      var sReason = oEvent.getParameter("reason");
      if (sReason !== "ClosedByAPI" && this._aTourSteps && this._aTourSteps.length > 0) {
        oEvent.preventDefault();
      }
    },

     getStyledGroupHeader: function (oGroup) {

        if (!oGroup) {
            return new sap.m.GroupHeaderListItem({
                title: ""
            });
        }

        const defaultStyle = {
            background: "#00b6c6",
            textColor: "#000000"
        };

        const oHeader = new sap.m.GroupHeaderListItem({
            title: oGroup.key
        });

        oHeader.addEventDelegate({
            onAfterRendering: function () {
                this.$().css({
                    "background": defaultStyle.background,
                    "color": defaultStyle.textColor
                });
            }
        }, oHeader);

        return oHeader;
    }
  })
});