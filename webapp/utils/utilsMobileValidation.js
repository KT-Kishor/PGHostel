sap.ui.define(["sap/ui/core/Fragment", "sap/ui/model/Filter"], function (Fragment, Filter) {
  "use strict";

  return {
    filterCombo: function (oController, sComboBoxId, sField, sValue, sFragmentId) {
      const oCombo = sFragmentId ? Fragment.byId(sFragmentId, sComboBoxId) : oController.byId(sComboBoxId);
      if (!oCombo) return;
      const oBinding = oCombo.getBinding("items");
      if (oBinding) oBinding.filter([new Filter(sField, "EQ", sValue)]);
    },

    onStateChange: function (oEvent, oController, oOptions) {
      const sSelectedState = oEvent.getSource().getSelectedKey();
      if (oOptions.cityComboId) this.filterCombo(oController, oOptions.cityComboId, "stateName", sSelectedState, oOptions.sFragmentId);

      const oJobModel = oController.getView().getModel(oOptions.jobModelName);
      if (oJobModel) oJobModel.setProperty("/city", "");
    },
    onCityChange: function (oEvent, oController, oOptions) {
      const sSelectedCity = oEvent.getSource().getSelectedKey();
      const oJobModel = oController.getView().getModel(oOptions.jobModelName);
      if (oJobModel) oJobModel.setProperty("/city", sSelectedCity);
    },
    _autoSelectISD: function (oController, oOptions, sCountryCode) {
      if (!oOptions.isdComboId) return;
      const oISDCombo = oOptions.sFragmentId ? Fragment.byId(oOptions.sFragmentId, oOptions.isdComboId) : oController.byId(oOptions.isdComboId);
      const oBinding = oISDCombo?.getBinding("items");
      if (!oBinding) return;

      const aItems = oISDCombo.getItems();
      if (aItems.length === 1) {
        const sCode = aItems[0].getBindingContext(oOptions.countryModelName).getObject().stdCode;
        oISDCombo.setSelectedKey(sCode);
        oISDCombo.setEnabled(false);
        const oJobModel = oController.getView().getModel(oOptions.jobModelName);
        oJobModel.setProperty("/stdCode", sCode);
      } else {
        oISDCombo.setSelectedKey("");
        oISDCombo.setEnabled(true);
      }
    },
    onCountryChange: function (oEvent, oController, oOptions) {
      const oInput = oEvent.getSource();
      const sInput = (oInput.getValue() || "").trim();
      const oCountryModel = oController.getView().getModel(oOptions.countryModelName);
      const aCountries = oCountryModel?.getData() || [];

      // Reset dependencies first for any country change
      this._resetCountryDependencies(oController, {
        jobModelName: oOptions.jobModelName,
        statePath: oOptions.statePath,
        cityPath: oOptions.cityPath,
        mobilePath: oOptions.mobilePath,
        stateComboId: oOptions.stateComboId,
        cityComboId: oOptions.cityComboId,
        mobileInputId: oOptions.mobileInputId,
        isdComboId: oOptions.isdComboId,
        sFragmentId: oOptions.sFragmentId,
      });

      // If empty after reset, stop here
      if (!sInput) {
        return;
      }

      // Find matching country and process it
      const oMatch = aCountries.find((c) => {
        if (!c) return false;
        const inputVal = sInput.toLowerCase();
        const codeMatches = c.code && c.code.toLowerCase() === inputVal;
        const nameMatches = c.countryName && c.countryName.toLowerCase() === inputVal;
        return codeMatches || nameMatches;
      });

      if (!oMatch) {
        oInput.setValueState(sap.ui.core.ValueState.Error);
        oInput.setValueStateText("Invalid country");
        return;
      }
      // Valid country found - process it
      oInput.setValueState(sap.ui.core.ValueState.None);
      oInput.setValueStateText("");

      const oJobModel = oController.getView().getModel(oOptions.jobModelName);
      oJobModel.setProperty("/country", oMatch.code);
      oJobModel.setProperty("/stdCode", oMatch.stdCode);

      // Filter dependent combos
      if (oOptions.stateComboId) {
        this.filterCombo(oController, oOptions.stateComboId, "countryCode", oMatch.code, oOptions.sFragmentId);
      }

      if (oOptions.isdComboId) {
        this.filterCombo(oController, oOptions.isdComboId, "code", oMatch.code, oOptions.sFragmentId);
        this._autoSelectISD(oController, oOptions, oMatch.code);
      }

      // Set mobile max length
      if (oOptions.mobileInputId) {
        this.setMobileMaxLength(oController, oOptions.mobileInputId, oOptions.sFragmentId, oMatch.code);
      }
    },
    _resetCountryDependencies: function (oController, oOptions) {
      const oJobModel = oController.getView().getModel(oOptions.jobModelName);
      if (oJobModel) {
        if (oOptions.statePath) oJobModel.setProperty(oOptions.statePath, "");
        if (oOptions.cityPath) oJobModel.setProperty(oOptions.cityPath, "");
        if (oOptions.mobilePath) oJobModel.setProperty(oOptions.mobilePath, "");
      }

      ["stateComboId", "cityComboId", "isdComboId"].forEach((idKey) => {
        const comboId = oOptions[idKey];
        if (!comboId) return;
        const oCombo = oOptions.sFragmentId ? Fragment.byId(oOptions.sFragmentId, comboId) : oController.byId(comboId);
        if (oCombo) {
          oCombo.setSelectedKey("");
          oCombo.getBinding("items")?.filter([]);
          if (idKey === "isdComboId") oCombo.setEnabled(true);
        }
      });

      if (oOptions.mobileInputId) {
        const oMobile = oOptions.sFragmentId ? Fragment.byId(oOptions.sFragmentId, oOptions.mobileInputId) : oController.byId(oOptions.mobileInputId);
        if (oMobile) {
          oMobile.setValue("");
          oMobile.setValueState(sap.ui.core.ValueState.None);
          oMobile.setValueStateText("");
          // leave maxLength to onCountryChange/onISDChange
        }
      }
    },
    setMobileMaxLength: function (oController, sMobileInputId, sFragmentId, sCountry) {
      const oMobileInput = sFragmentId ? Fragment.byId(sFragmentId, sMobileInputId) : oController.byId(sMobileInputId);
      if (!oMobileInput) return;

      const iMaxLength = (sCountry || "").trim().toUpperCase() === "IN" ? 10 : 20;
      oMobileInput.setMaxLength(iMaxLength);
      console.log("MaxLength set to:", iMaxLength, "for country:", sCountry);
    },

    onISDChange: function (oEvent, oController, oOptions) {
      const sSelectedStdCode = oEvent.getSource().getSelectedKey();
      const aCountries = oController.getView().getModel(oOptions.countryModelName)?.getData() || [];
      const oMatch = aCountries.find((c) => c.stdCode === sSelectedStdCode);
      if (!oMatch) return;

      const oJobModel = oController.getView().getModel(oOptions.jobModelName);
      oJobModel.setProperty("/stdCode", sSelectedStdCode);
      oJobModel.setProperty("/country", oMatch.code);

      if (oOptions.mobileInputId) {
        this.setMobileMaxLength(oController, oOptions.mobileInputId, oOptions.sFragmentId, oMatch.code);
      }
    },
    validateMobile: function (oEvent, oController, oOptions = {}) {
      const oInput = oEvent.getSource() || (oOptions.sFragmentId ? Fragment.byId(oOptions.sFragmentId, oOptions.mobileInputId) : oController.byId(oOptions.mobileInputId));
      if (!oInput) return true;

      const sValue = (oInput.getValue() || "").trim();
      const iMaxLength = oInput.getMaxLength();

      oInput.setValueState(sap.ui.core.ValueState.None);
      oInput.setValueStateText("");

      if (!sValue) return true;

      if (sValue.startsWith("0")) {
        oInput.setValueState(sap.ui.core.ValueState.Error);
        oInput.setValueStateText("Mobile number cannot begin with 0");
        return false;
      }

      if (!/^\d+$/.test(sValue)) {
        oInput.setValueState(sap.ui.core.ValueState.Error);
        oInput.setValueStateText("Only digits are allowed");
        return false;
      }

      if (iMaxLength === 10 && sValue.length !== 10) {
        oInput.setValueState(sap.ui.core.ValueState.Error);
        oInput.setValueStateText("Mobile number must be exactly 10 digits");
        return false;
      }

      if (iMaxLength === 20 && (sValue.length < 4 || sValue.length > 20)) {
        oInput.setValueState(sap.ui.core.ValueState.Error);
        oInput.setValueStateText("Mobile number must be between 4 and 20 digits long");
        return false;
      }
      return true;
    },
  };
});
